from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from app.api.models import EvaluateRequest, EvaluateResponse
from app.core.tmdb import fetch_movie_metadata, MovieNotFoundError, TMDBError
from app.agents.critic import run_critic_agent, GroqError
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CineSwarm API")

@app.get("/")
def read_root():
    return {"message": "Welcome to CineSwarm API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/v1/agents/critic/evaluate", response_model=EvaluateResponse)
async def evaluate_movie(request: EvaluateRequest):
    try:
        movie_metadata = await fetch_movie_metadata(request.title)
        evaluation = await run_critic_agent(movie_metadata)
        return evaluation
    except MovieNotFoundError as e:
        logger.warning(f"Movie not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except (TMDBError, GroqError, ValueError) as e:
        logger.error(f"Error during evaluation: {e}")
        # Return a generic 500 for other issues, avoiding stack traces in response
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    except Exception as e:
        logger.exception("Unexpected error")
        raise HTTPException(status_code=500, detail="Internal Server Error")

