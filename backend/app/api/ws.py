from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import structlog
from app.agents.graph import graph

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
    
    # Retrieve the state to kick off the graph
    state = session_states.get(session_id)
    if not state:
        await websocket.send_json({"error": "Session not found or already running"})
        await websocket.close()
        return

    from typing import cast
    from app.agents.graph import AgentState
    state_typed = cast(AgentState, state)
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
    except WebSocketDisconnect:
        log.info("WebSocket disconnected by client")
    except Exception as e:
        log.error("Error during graph execution", error=str(e))
        try:
            await websocket.send_json({"error": "Internal server error during execution"})
        except:
            pass
    finally:
        active_sessions.pop(session_id, None)
        session_states.pop(session_id, None)
        try:
            await websocket.close()
        except:
            pass
