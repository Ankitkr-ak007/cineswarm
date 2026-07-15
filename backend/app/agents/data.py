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
    
    # movie_metadata from TMDB already has vote_average and vote_count
    actual_rating = movie_metadata.get("vote_average", 0.0)
    vote_count = movie_metadata.get("vote_count", 0)
    
    # We can pass through important metadata
    metadata = {
        "release_date": movie_metadata.get("release_date"),
        "popularity": movie_metadata.get("popularity"),
        "adult": movie_metadata.get("adult", False),
        "genres": movie_metadata.get("genres", []),
        "certification": movie_metadata.get("certification")
    }
    
    log.info("Data agent execution complete", actual_rating=actual_rating)
    return DataAgentOutput(
        actual_rating=actual_rating,
        vote_count=vote_count,
        metadata=metadata
    )
