import json
import httpx
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
from app.db.supabase import get_supabase_client
import structlog

logger = structlog.get_logger(__name__)
async def get_gemini_embedding(text: str) -> list[float]:
    if not text:
        return [0.0] * 768
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={settings.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": 768
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=30.0)
        response.raise_for_status()
        data = response.json()
        return data["embedding"]["values"]

class HiddenGemsOutput(BaseModel):
    score: float
    reasoning: str
    similar_to: str = ""

class GeminiError(Exception):
    pass

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.RequestError, GeminiError))
)
async def run_hidden_gems_agent(movie_metadata: dict, session_id: str) -> HiddenGemsOutput:
    """
    Hidden Gems agent: Vector similarity over plot embeddings vs. user's liked movies.
    We mock the 'user liked movies' logic by finding similar movies in the DB,
    then asking Gemini to evaluate if it's a hidden gem based on similarity.
    """
    log = logger.bind(session_id=session_id, agent="hidden_gems")
    log.info("Starting hidden gems agent execution")
    
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")

    title = movie_metadata.get("title", "Unknown")
    overview = movie_metadata.get("overview", "")
    tmdb_id = movie_metadata.get("id", 0)

    # 1. Generate embedding for current movie
    try:
        embedding = await get_gemini_embedding(overview)
    except Exception as e:
        status_code = getattr(getattr(e, "response", None), "status_code", None)
        log.error("Failed to get Gemini embedding", error_type=type(e).__name__, status_code=status_code)
        embedding = [0.0] * 768

    # 2. Persist to DB (batch once when movie enters, as requested)
    supabase = get_supabase_client()
    similar_movies_str = "No similar movies found."
    
    if supabase:
        try:
            # Upsert movie with embedding
            movie_data = {
                "tmdb_id": tmdb_id,
                "title": title,
                "overview": overview,
                "genres": movie_metadata.get("genres", []),
                "release_date": movie_metadata.get("release_date"),
                "certification": movie_metadata.get("certification"),
                "adult": movie_metadata.get("adult", False),
                "embedding": embedding
            }
            # Ignore errors if it already exists or if schema is missing, but log it
            supabase.table("movies").upsert(movie_data).execute()
            
            # Find similar movies (match_movies RPC)
            # Assuming match_movies returns tmdb_id, title, similarity
            match_res = supabase.rpc("match_movies", {
                "query_embedding": embedding,
                "match_threshold": 0.5,
                "match_count": 3
            }).execute()
            
            matches = match_res.data
            if isinstance(matches, list):
                # Filter out the movie itself
                matches = [m for m in matches if isinstance(m, dict) and m.get("tmdb_id") != tmdb_id]
                if matches:
                    similar_titles = [m.get("title") for m in matches if isinstance(m, dict) and "title" in m]
                    similar_movies_str = ", ".join(str(t) for t in similar_titles)
        except Exception as e:
            log.warning("Database operation failed in hidden gems (schema might be missing)", error=str(e))
            # Graceful degradation if DB is not setup
            pass

    # 3. Call Gemini to evaluate
    system_prompt = """You are a Hidden Gems analyst evaluating a candidate movie.
You look for underappreciated movies or strong thematic similarities to other great movies.
Output strictly as JSON: {"score": <1-10>, "reasoning": "<2-3 sentences>", "similar_to": "<movie titles>"}"""

    user_prompt = f"Evaluate the movie: '{title}'. Overview: {overview}\nSimilar movies found in our database: {similar_movies_str}"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": system_prompt + "\n\n" + user_prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.5
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
        except httpx.HTTPError as e:
            log.error("Gemini API error", error=str(e))
            raise GeminiError(f"Gemini API Error: {str(e)}")

        data = response.json()
        try:
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(content)
            log.info("Hidden gems evaluation complete", score=parsed.get("score"))
            
            # Ensure similar_to uses our DB matches if LLM didn't provide one
            if not parsed.get("similar_to") or parsed.get("similar_to") == "":
                parsed["similar_to"] = similar_movies_str
                
            return HiddenGemsOutput(**parsed)
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            log.error("JSON decode error", error=str(e), data=data)
            raise GeminiError(f"Failed to parse JSON: {e}")
