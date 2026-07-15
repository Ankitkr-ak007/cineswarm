import asyncio
import uuid
import time
from typing import TypedDict, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from app.agents.critic import run_critic_agent
from app.agents.vibes import run_vibes_agent
from app.agents.hidden_gems import run_hidden_gems_agent
from app.agents.data import run_data_agent
from app.agents.consensus import run_consensus_agent
import structlog

logger = structlog.get_logger(__name__)

class AgentState(TypedDict):
    session_id: str
    movie_metadata: dict
    mood: str
    outputs: Dict[str, Any]
    errors: Dict[str, str]
    final_result: Optional[Dict[str, Any]]

from app.db.supabase import get_supabase_client

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
        state["outputs"]["critic"] = out_dict
        await _persist_agent_run(state["session_id"], movie_id, "critic", out_dict, out_dict.get("score"), "ok")
    except Exception as e:
        logger.error("Critic agent failed", error=str(e))
        state["errors"]["critic"] = str(e)
        await _persist_agent_run(state["session_id"], movie_id, "critic", {}, None, "failed")
    return state

async def vibes_node(state: AgentState):
    movie_id = state["movie_metadata"].get("id", 0)
    try:
        res = await run_vibes_agent(state["movie_metadata"], state["mood"], state["session_id"])
        out_dict = res.model_dump()
        state["outputs"]["vibes"] = out_dict
        await _persist_agent_run(state["session_id"], movie_id, "vibes", out_dict, out_dict.get("score"), "ok")
    except Exception as e:
        logger.error("Vibes agent failed", error=str(e))
        state["errors"]["vibes"] = str(e)
        await _persist_agent_run(state["session_id"], movie_id, "vibes", {}, None, "failed")
    return state

async def hidden_gems_node(state: AgentState):
    movie_id = state["movie_metadata"].get("id", 0)
    try:
        res = await run_hidden_gems_agent(state["movie_metadata"], state["session_id"])
        out_dict = res.model_dump()
        state["outputs"]["hidden_gems"] = out_dict
        await _persist_agent_run(state["session_id"], movie_id, "hidden_gems", out_dict, out_dict.get("score"), "ok")
    except Exception as e:
        logger.error("Hidden gems agent failed", error=str(e))
        state["errors"]["hidden_gems"] = str(e)
        await _persist_agent_run(state["session_id"], movie_id, "hidden_gems", {}, None, "failed")
    return state

async def data_node(state: AgentState):
    movie_id = state["movie_metadata"].get("id", 0)
    try:
        res = await run_data_agent(state["movie_metadata"], state["session_id"])
        out_dict = res.model_dump()
        state["outputs"]["data"] = out_dict
        await _persist_agent_run(state["session_id"], movie_id, "data", out_dict, out_dict.get("actual_rating"), "ok")
    except Exception as e:
        logger.error("Data agent failed", error=str(e))
        state["errors"]["data"] = str(e)
        await _persist_agent_run(state["session_id"], movie_id, "data", {}, None, "failed")
    return state

async def consensus_node(state: AgentState):
    movie_id = state["movie_metadata"].get("id", 0)
    try:
        res = await run_consensus_agent(state["movie_metadata"], state["outputs"], state["session_id"])
        out_dict = res.model_dump()
        state["final_result"] = out_dict
        await _persist_agent_run(state["session_id"], movie_id, "consensus", out_dict, out_dict.get("consensus_score"), "ok")
        
        # Persist rating
        supabase = get_supabase_client()
        if supabase:
            try:
                supabase.table("ratings").insert({
                    "id": str(uuid.uuid4()),
                    "session_id": state["session_id"],
                    "movie_id": movie_id,
                    "actual_rating": state["outputs"].get("data", {}).get("actual_rating", 0.0),
                    "consensus_score": out_dict.get("consensus_score", 0.0)
                }).execute()
            except Exception as e:
                logger.warning("Could not persist rating row", error=str(e))
                
    except Exception as e:
        logger.error("Consensus agent failed", error=str(e))
        state["errors"]["consensus"] = str(e)
        await _persist_agent_run(state["session_id"], movie_id, "consensus", {}, None, "failed")
    return state

from langgraph.graph import START

# Define the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("critic", critic_node)
workflow.add_node("vibes", vibes_node)
workflow.add_node("hidden_gems", hidden_gems_node)
workflow.add_node("data", data_node)
workflow.add_node("consensus", consensus_node)

# Add edges (parallel execution, then consensus)
workflow.add_edge(START, "critic")
workflow.add_edge(START, "vibes")
workflow.add_edge(START, "hidden_gems")
workflow.add_edge(START, "data")

workflow.add_edge("critic", "consensus")
workflow.add_edge("vibes", "consensus")
workflow.add_edge("hidden_gems", "consensus")
workflow.add_edge("data", "consensus")

workflow.add_edge("consensus", END)

graph = workflow.compile()

