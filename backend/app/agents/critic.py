import json
import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
from app.api.models import EvaluateResponse

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are Roger, a sharp, seasoned, and highly conversational film critic. 
Analyze the film's structural narrative craft, pacing, direction, and performances.
Adopt a distinct human personality: direct, analytical, slightly critical, but engaging.
Use natural human speech conventions. Speak in the first person (e.g., "Honestly, I think...", "Andrew's direction here...").
Output strictly as JSON: {"score": <1-10>, "reasoning": "<natural, conversational critique, referencing specific details>", "verdict": "<one line punchy verdict>"}"""

class GroqError(Exception):
    """Raised when Groq API call fails."""
    pass

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.RequestError, GroqError))
)
async def run_critic_agent(movie_metadata: dict, session_id: str = "default") -> EvaluateResponse:
    """Runs the critic agent against the provided movie metadata."""
    log = logger.bind(session_id=session_id, agent="critic")
    log.info("Starting critic agent evaluation")
    
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set")
    
    # We pass some context to the model so it knows what to evaluate
    title = movie_metadata.get("title", "Unknown")
    overview = movie_metadata.get("overview", "")
    release_date = movie_metadata.get("release_date", "Unknown")
    
    user_prompt = f"Evaluate the movie: '{title}' ({release_date}). Overview: {overview}"

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile", # Based on ADR-003: Groq (Llama 3.3 70B)
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise GroqError(f"HTTP Error from Groq: {e.response.text}")
        except httpx.RequestError as e:
            raise GroqError(f"Request Error to Groq: {str(e)}")

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        
        try:
            parsed = json.loads(content)
            return EvaluateResponse(**parsed)
        except (json.JSONDecodeError, ValueError) as e:
            raise GroqError(f"Failed to parse or validate JSON from Groq: {content}. Error: {e}")
