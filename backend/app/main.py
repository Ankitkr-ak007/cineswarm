from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.models import (
    RecommendRequest,
    RecommendResponse,
    FeedbackRequest,
    FeedbackResponse,
    TitleRecommendRequest,
    FavoriteRequest,
    FavoriteResponse,
    MovieHistoryItem,
)
from app.core.tmdb import fetch_movie_metadata, suggest_movies_from_llm
from app.api.ws import router as ws_router, session_states
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
    log.info("Received recommendation request")
    
    try:
        candidate_titles = await suggest_movies_from_llm(body.mood, body.genres, "general")
        
        movie_metadata = None
        for title in candidate_titles:
            try:
                meta = await fetch_movie_metadata(title)
                movie_metadata = meta
                break
            except Exception:
                continue
                
        if not movie_metadata:
            # Fallback if no dynamically suggested movie works
            fallback_titles = ["Toy Story", "Finding Nemo", "Inception", "Inside Out"]
            for title in fallback_titles:
                try:
                    meta = await fetch_movie_metadata(title)
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
                    "query_context": {"mood": body.mood, "genres": body.genres, "mode": "general"}
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

@app.post("/api/v1/recommend/title", response_model=RecommendResponse)
@limiter.limit("5/minute")
async def recommend_movie_by_title(request: Request, body: TitleRecommendRequest):
    session_id = str(uuid.uuid4())
    log = logger.bind(session_id=session_id)
    log.info("Received title recommendation request", title=body.title)
    
    try:
        movie_metadata = await fetch_movie_metadata(body.title)
        
        # Persist session to DB
        supabase = get_supabase_client()
        if supabase:
            try:
                # Ensure the movie exists in the movies table to prevent foreign key errors in agent_runs!
                supabase.table("movies").upsert({
                    "tmdb_id": movie_metadata.get("id"),
                    "title": movie_metadata.get("title"),
                    "overview": movie_metadata.get("overview"),
                    "release_date": movie_metadata.get("release_date"),
                    "adult": movie_metadata.get("adult"),
                    "poster_path": movie_metadata.get("poster_path")
                }).execute()

                supabase.table("sessions").insert({
                    "id": session_id,
                    "query_context": {"mood": f"Search by title: {body.title}", "genres": [], "mode": "general"}
                }).execute()
            except Exception as e:
                log.warning("Could not persist session to DB", error=str(e))
                
        # Store state for WebSocket
        session_states[session_id] = {
            "session_id": session_id,
            "movie_metadata": movie_metadata,
            "mood": f"Direct search: {body.title}",
            "outputs": {},
            "errors": {},
            "final_result": None
        }
        
        return RecommendResponse(session_id=session_id)
        
    except Exception as e:
        log.exception("Error initiating title recommendation")
        raise HTTPException(status_code=500, detail="Failed to search movie and initiate debate")

@app.post("/api/v1/favorites", response_model=FavoriteResponse)
@limiter.limit("10/minute")
async def save_favorite(request: Request, body: FavoriteRequest):
    log = logger.bind(movie_id=body.movie_id)
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        from app.core.tmdb import fetch_movie_details_by_id
        details = await fetch_movie_details_by_id(body.movie_id)
        supabase.table("movies").upsert({
            "tmdb_id": details.get("id"),
            "title": details.get("title"),
            "overview": details.get("overview"),
            "release_date": details.get("release_date"),
            "adult": details.get("adult"),
            "poster_path": details.get("poster_path")
        }).execute()

        # Insert into feedback
        supabase.table("feedback").insert({
            "id": str(uuid.uuid4()),
            "movie_id": body.movie_id,
            "watched": body.watched
        }).execute()
        return FavoriteResponse(success=True)
    except Exception as e:
        log.error("Failed to save favorite", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to save favorite: {str(e)}")

@app.get("/api/v1/favorites", response_model=list[MovieHistoryItem])
async def get_favorites():
    supabase = get_supabase_client()
    if not supabase:
        return []
    try:
        res = supabase.table("feedback").select("*, movies(*)").not_.is_("movie_id", "null").order("created_at", desc=True).execute()
        items = []
        seen = set()
        for item in res.data or []:
            movie = item.get("movies")
            if movie and isinstance(movie, dict):
                tmdb_id = movie.get("tmdb_id")
                if tmdb_id and tmdb_id not in seen:
                    seen.add(tmdb_id)
                    items.append(MovieHistoryItem(
                        tmdb_id=tmdb_id,
                        title=movie.get("title") or "Unknown",
                        poster_path=movie.get("poster_path"),
                        created_at=item.get("created_at")
                    ))
        return items
    except Exception as e:
        logger.error("Failed to fetch favorites", error=str(e))
        return []

@app.post("/api/v1/feedback", response_model=FeedbackResponse)
@limiter.limit("10/minute")
async def submit_feedback(request: Request, body: FeedbackRequest):
    log = logger.bind(session_id=body.session_id)
    log.info("Received feedback", type=body.feedback_type)
    
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    try:
        supabase.table("feedback").insert({
            "id": str(uuid.uuid4()),
            "session_id": body.session_id,
            "feedback_type": body.feedback_type,
            "comment": body.comment
        }).execute()
        return FeedbackResponse(success=True)
    except Exception:
        log.exception("Error submitting feedback")
        raise HTTPException(status_code=500, detail="Failed to save feedback")
