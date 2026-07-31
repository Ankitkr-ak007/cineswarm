import structlog
from pydantic import BaseModel

logger = structlog.get_logger(__name__)

class DataAgentOutput(BaseModel):
    actual_rating: float
    vote_count: int
    metadata: dict
    
async def run_data_agent(movie_metadata: dict, session_id: str) -> DataAgentOutput:
    """
    Data agent: Pulls actual TMDB rating, vote count, metadata.
    This is a deterministic retrieval agent with no LLM.
    """
    log = logger.bind(session_id=session_id, agent="data")
    log.info("Starting data agent execution")
    
    # movie_metadata from TMDB has vote_average and vote_count
    genres_dict = movie_metadata.get("genres") if isinstance(movie_metadata.get("genres"), dict) else {}
    raw_rating = movie_metadata.get("vote_average")
    if raw_rating is None or raw_rating == 0.0:
        raw_rating = genres_dict.get("vote_average") or 0.0
    try:
        actual_rating = round(float(raw_rating), 1)
    except (ValueError, TypeError):
        actual_rating = 0.0
    
    raw_votes = movie_metadata.get("vote_count")
    if raw_votes is None or raw_votes == 0:
        raw_votes = genres_dict.get("vote_count") or 0
    try:
        vote_count = int(raw_votes)
    except (ValueError, TypeError):
        vote_count = 0
    
    # We can pass through important metadata
    metadata = {
        "release_date": movie_metadata.get("release_date"),
        "popularity": movie_metadata.get("popularity") or genres_dict.get("popularity"),
        "adult": movie_metadata.get("adult", False),
        "genres": movie_metadata.get("genres", []),
        "certification": movie_metadata.get("certification")
    }
    
    log.info("Data agent execution complete", actual_rating=actual_rating, vote_count=vote_count)
    return DataAgentOutput(
        actual_rating=actual_rating,
        vote_count=vote_count,
        metadata=metadata
    )
