import uuid
from typing import TypedDict, Dict, Any, Optional, Annotated
import structlog

from langgraph.graph import StateGraph, END, START

from app.agents.critic import run_critic_agent
from app.agents.vibes import run_vibes_agent
from app.agents.hidden_gems import run_hidden_gems_agent
from app.agents.data import run_data_agent
from app.agents.consensus import run_consensus_agent
from app.db.supabase import get_supabase_client

def update_dict(dict1: dict, dict2: dict) -> dict:
    if dict1 is None:
        dict1 = {}
    if dict2 is None:
        dict2 = {}
    d = dict1.copy()
    d.update(dict2)
    return d

logger = structlog.get_logger(__name__)

class AgentState(TypedDict):
    session_id: str
    movie_metadata: dict
    mood: str
    outputs: Annotated[Dict[str, Any], update_dict]
    errors: Annotated[Dict[str, str], update_dict]
    final_result: Optional[Dict[str, Any]]

async def _persist_agent_run(session_id: str, movie_id: int, agent_name: str, output: dict, score: float, status: str):
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table("agent_runs").insert({
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "movie_id": movie_id,
                "agent_name": agent_name,
                "output": output,
                "score": score,
                "status": status
            }).execute()
        except Exception as e:
            logger.warning(f"Could not persist {agent_name} run", error=str(e))

async def critic_node(state: AgentState):
    movie_id = state["movie_metadata"].get("id", 0)
    try:
        res = await run_critic_agent(state["movie_metadata"], state["session_id"])
        out_dict = res.model_dump()
        score_val = out_dict.get("score")
        await _persist_agent_run(state["session_id"], movie_id, "critic", out_dict, float(score_val) if score_val is not None else 0.0, "ok")
        return {"outputs": {"critic": out_dict}}
    except Exception as e:
        logger.error("Critic agent failed", error=str(e))
        await _persist_agent_run(state["session_id"], movie_id, "critic", {}, 0.0, "failed")
        return {"errors": {"critic": str(e)}}

async def vibes_node(state: AgentState):
    movie_id = state["movie_metadata"].get("id", 0)
    try:
        res = await run_vibes_agent(state["movie_metadata"], state["mood"], state["outputs"], state["session_id"])
        out_dict = res.model_dump()
        score_val = out_dict.get("score")
        await _persist_agent_run(state["session_id"], movie_id, "vibes", out_dict, float(score_val) if score_val is not None else 0.0, "ok")
        return {"outputs": {"vibes": out_dict}}
    except Exception as e:
        logger.error("Vibes agent failed", error=str(e))
        await _persist_agent_run(state["session_id"], movie_id, "vibes", {}, 0.0, "failed")
        return {"errors": {"vibes": str(e)}}

async def hidden_gems_node(state: AgentState):
    movie_id = state["movie_metadata"].get("id", 0)
    try:
        res = await run_hidden_gems_agent(state["movie_metadata"], state["outputs"], state["session_id"])
        out_dict = res.model_dump()
        score_val = out_dict.get("score")
        await _persist_agent_run(state["session_id"], movie_id, "hidden_gems", out_dict, float(score_val) if score_val is not None else 0.0, "ok")
        return {"outputs": {"hidden_gems": out_dict}}
    except Exception as e:
        logger.error("Hidden gems agent failed", error=str(e))
        await _persist_agent_run(state["session_id"], movie_id, "hidden_gems", {}, 0.0, "failed")
        return {"errors": {"hidden_gems": str(e)}}

async def data_node(state: AgentState):
    movie_id = state["movie_metadata"].get("id", 0)
    try:
        res = await run_data_agent(state["movie_metadata"], state["session_id"])
        out_dict = res.model_dump()
        score_val = out_dict.get("actual_rating")
        await _persist_agent_run(state["session_id"], movie_id, "data", out_dict, float(score_val) if score_val is not None else 0.0, "ok")
        return {"outputs": {"data": out_dict}}
    except Exception as e:
        logger.error("Data agent failed", error=str(e))
        await _persist_agent_run(state["session_id"], movie_id, "data", {}, 0.0, "failed")
        return {"errors": {"data": str(e)}}

async def consensus_node(state: AgentState):
    movie_id = state["movie_metadata"].get("id", 0)
    try:
        res = await run_consensus_agent(state["movie_metadata"], state["outputs"], state["session_id"])
        out_dict = res.model_dump()
        score_val = out_dict.get("consensus_score")
        await _persist_agent_run(state["session_id"], movie_id, "consensus", out_dict, float(score_val) if score_val is not None else 0.0, "ok")
        
        # Persist rating
        supabase = get_supabase_client()
        if supabase:
            try:
                supabase.table("ratings").insert({
                    "id": str(uuid.uuid4()),
                    "session_id": state["session_id"],
                    "movie_id": movie_id,
                    "actual_rating": state.get("outputs", {}).get("data", {}).get("actual_rating", 0.0),
                    "consensus_score": out_dict.get("consensus_score", 0.0)
                }).execute()
            except Exception as e:
                logger.warning("Could not persist rating row", error=str(e))
        return {"final_result": out_dict}
    except Exception as e:
        logger.error("Consensus agent failed", error=str(e))
        await _persist_agent_run(state["session_id"], movie_id, "consensus", {}, 0.0, "failed")
        return {"errors": {"consensus": str(e)}}

# Define the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("critic", critic_node)
workflow.add_node("vibes", vibes_node)
workflow.add_node("hidden_gems", hidden_gems_node)
workflow.add_node("data", data_node)
workflow.add_node("consensus", consensus_node)

# Add edges (sequential human-like back-and-forth debate)
workflow.add_edge(START, "data")
workflow.add_edge("data", "critic")
workflow.add_edge("critic", "vibes")
workflow.add_edge("vibes", "hidden_gems")
workflow.add_edge("hidden_gems", "consensus")
workflow.add_edge("consensus", END)

graph = workflow.compile()
