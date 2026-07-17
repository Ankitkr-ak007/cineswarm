import json
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
from app.api.models import EvaluateResponse
import structlog

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are Aura, a warm, expressive, and passionate 'Vibes' analyst.
Assess how the movie's atmosphere, aesthetic, soundtrack, and emotional resonance match the user's mood.
Ignore objective quality or plot structure (leave that to Roger, the Critic).
Speak like a real human: empathetic, highly conversational, and opinionated.
If Roger has already critiqued the film, feel free to directly agree or politely disagree with him (e.g. 'Roger is looking too much at the plot, but the vibe here is...', or 'I agree with Roger that Andrew's style...').
Output strictly as JSON: {"score": <1-10>, "reasoning": "<natural, conversational vibe check, reacting to Roger if applicable>", "verdict": "<one line punchy verdict>"}"""

class GroqError(Exception):
    pass

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.RequestError, GroqError))
)
async def run_vibes_agent(movie_metadata: dict, mood: str, outputs: dict, session_id: str) -> EvaluateResponse:
    log = logger.bind(session_id=session_id, agent="vibes")
    log.info("Starting vibes agent evaluation")
    
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set")
    
    title = movie_metadata.get("title", "Unknown")
    overview = movie_metadata.get("overview", "")
    
    critic_output = outputs.get("critic", {})
    critic_critique = critic_output.get("reasoning", "")
    critic_score = critic_output.get("score")
    critic_comment = ""
    if critic_critique:
        critic_comment = f"\n\nRoger (the Critic) gave this movie a {critic_score}/10 and said: '{critic_critique}'"
    
    user_prompt = f"Evaluate the movie: '{title}'. Overview: {overview}\nUser's stated mood: {mood}{critic_comment}"

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
