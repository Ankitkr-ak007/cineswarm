from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import structlog
from app.agents.graph import graph
from app.db.supabase import get_supabase_client

logger = structlog.get_logger(__name__)
router = APIRouter()

# In-memory store of active sessions (in a real app, use Redis pub/sub)
active_sessions: Dict[str, WebSocket] = {}
# To pass state between the POST endpoint and the WS endpoint
session_states: Dict[str, dict] = {}

@router.websocket("/api/v1/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    active_sessions[session_id] = websocket
    
    log = logger.bind(session_id=session_id)
    log.info("WebSocket connected")
    
    # 1. Try to load historical completed agent runs from the database
    db_runs = []
    try:
        supabase = get_supabase_client()
        if supabase:
            res = supabase.table("agent_runs").select("*").eq("session_id", session_id).execute()
            db_runs = res.data or []
    except Exception as e:
        log.warning("Could not fetch agent runs from Supabase", error=str(e))

    if db_runs:
        log.info("Found existing agent runs in database, sending historical data")
        try:
            for run in db_runs:
                agent_name = run.get("agent_name")
                output = run.get("output")
                status = run.get("status")
                
                if agent_name == "consensus":
                    await websocket.send_json({
                        "agent": agent_name,
                        "status": "complete",
                        "data": output
                    })
                elif agent_name in ["critic", "vibes", "hidden_gems", "data"]:
                    await websocket.send_json({
                        "agent": agent_name,
                        "status": "complete",
                        "data": output,
                        "error": None if status == "ok" else "Agent failed"
                    })
            await websocket.send_json({"status": "done"})
        except WebSocketDisconnect:
            log.info("WebSocket disconnected while sending historical data")
        except Exception as e:
            log.error("Error sending historical data", error=str(e))
        finally:
            active_sessions.pop(session_id, None)
            try:
                await websocket.close()
            except Exception:
                pass
            return

    # Retrieve the state to kick off the graph
    state = session_states.get(session_id)
    if not state:
        await websocket.send_json({"error": "Session not found or already running"})
        await websocket.close()
        return

    from typing import cast
    from app.agents.graph import AgentState
    state_typed = cast(AgentState, state)
    completed = False
    try:
        # We use astream to stream updates as nodes complete
        # graph.astream yields (node_name, state_update)
        async for output in graph.astream(state_typed):
            # Output is a dict like {'critic': {'outputs': {'critic': ...}}}
            for node_name, node_state in output.items():
                if node_name == "consensus":
                    await websocket.send_json({
                        "agent": node_name,
                        "status": "complete",
                        "data": node_state.get("final_result", {})
                    })
                elif node_name in ["critic", "vibes", "hidden_gems", "data"]:
                    await websocket.send_json({
                        "agent": node_name,
                        "status": "complete",
                        "data": node_state.get("outputs", {}).get(node_name, {}),
                        "error": node_state.get("errors", {}).get(node_name)
                    })
        
        await websocket.send_json({"status": "done"})
        completed = True
    except WebSocketDisconnect:
        log.info("WebSocket disconnected by client")
    except Exception as e:
        log.error("Error during graph execution", error=str(e))
        try:
            await websocket.send_json({"error": "Internal server error during execution"})
        except Exception:
            pass
    finally:
        active_sessions.pop(session_id, None)
        if completed:
            session_states.pop(session_id, None)
        try:
            await websocket.close()
        except Exception:
            pass
