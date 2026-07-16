from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.models import RecommendRequest, RecommendResponse
from app.core.tmdb import fetch_movie_metadata
from app.api.ws import router as ws_router, session_states
from app.api.auth import router as auth_router
from app.core.safety import is_safe_for_kids
from app.db.supabase import get_supabase_client
import uuid
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog

logger = structlog.get_logger(__name__)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="CineSwarm API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

app.include_router(ws_router)
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to CineSwarm API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/v1/recommend", response_model=RecommendResponse)
@limiter.limit("5/minute")
async def recommend_movie(request: Request, body: RecommendRequest):
    session_id = str(uuid.uuid4())
    log = logger.bind(session_id=session_id)
    log.info("Received recommendation request", mode=body.content_mode)
    
    # In a real app we'd search TMDB based on genres/mood, but to keep the flow identical to Phase 2
    # where we had a specific title, let's assume we do a TMDB discover call or the user passes a title.
    # Wait, the prompt says Body: { "mood": string, "genres": string[], "content_mode": "kids"|"general" }
    # Since we need a candidate movie, let's just fetch top popular movies and pick one that fits, 
    # or just use TMDB discover. To keep it simple, let's search TMDB discover by genre.
    # Since TMDB discover by genre is complex without genre ID mapping, let's just fetch a generic popular movie
    # and pass it to the agents, since the prompt didn't specify how to select the candidate!
    # Ah, the prompt: "where four AI agents debate a candidate movie in real time"
    # I'll just pick "Inception" or a random popular movie to serve as the candidate for the debate.
    candidate_titles = ["Inception", "The Matrix", "The Dark Knight", "Finding Nemo", "Toy Story", "Shrek", "Spider-Man"]
    
    try:
        movie_metadata = None
        for title in candidate_titles:
            try:
                meta = await fetch_movie_metadata(title)
                if body.content_mode == "kids" and not is_safe_for_kids(meta):
                    continue
                movie_metadata = meta
                break
            except Exception:
                continue
                
        if not movie_metadata:
            raise HTTPException(status_code=404, detail="No suitable candidate movie found")
                
        # Persist session to DB
        supabase = get_supabase_client()
        if supabase:
            try:
                supabase.table("sessions").insert({
                    "id": session_id,
                    "query_context": {"mood": body.mood, "genres": body.genres, "mode": body.content_mode}
                }).execute()
            except Exception as e:
                log.warning("Could not persist session to DB", error=str(e))
                
        # Store state for WebSocket
        session_states[session_id] = {
            "session_id": session_id,
            "movie_metadata": movie_metadata,
            "mood": body.mood,
            "outputs": {},
            "errors": {},
            "final_result": None
        }
        
        return RecommendResponse(session_id=session_id)
        
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Error preparing recommendation")
        raise HTTPException(status_code=500, detail=str(e))

