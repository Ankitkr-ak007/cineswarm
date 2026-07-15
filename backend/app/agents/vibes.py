import json
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
from app.api.models import EvaluateResponse
import structlog

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are a Vibes analyst evaluating one candidate movie.
Assess how well the movie fits the user's stated mood/context.
Ignore objective quality (like plot holes) and focus strictly on the atmosphere, aesthetic, and emotional resonance.
Output strictly as JSON: {"score": <1-10>, "reasoning": "<2-3 sentences>", "verdict": "<one line>"}"""

class GroqError(Exception):
    pass

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.RequestError, GroqError))
)
async def run_vibes_agent(movie_metadata: dict, mood: str, session_id: str) -> EvaluateResponse:
    log = logger.bind(session_id=session_id, agent="vibes")
    log.info("Starting vibes agent evaluation")
    
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set")
    
    title = movie_metadata.get("title", "Unknown")
    overview = movie_metadata.get("overview", "")
    
    user_prompt = f"Evaluate the movie: '{title}'. Overview: {overview}\nUser's stated mood: {mood}"

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.5
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
        except httpx.HTTPError as e:
            log.error("Groq API error", error=str(e))
            raise GroqError(f"Groq API Error: {str(e)}")

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        
        try:
            parsed = json.loads(content)
            log.info("Vibes evaluation complete", score=parsed.get("score"))
            return EvaluateResponse(**parsed)
        except (json.JSONDecodeError, ValueError) as e:
            log.error("JSON decode error", error=str(e), content=content)
            raise GroqError(f"Failed to parse JSON: {e}")
