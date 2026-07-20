from app.api.models import EvaluateResponse
from app.core.llm import generate_json_with_fallback
import structlog

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are Roger, a sharp, seasoned, and highly conversational film critic. 
Analyze the film's structural narrative craft, pacing, direction, and performances.
Adopt a distinct human personality: direct, analytical, slightly critical, but engaging.
Use natural human speech conventions. Speak in the first person (e.g., "Honestly, I think...", "The direction here...").
Output strictly as JSON: {"score": <1-10>, "reasoning": "<natural, conversational critique, referencing specific details>", "verdict": "<one line punchy verdict>"}"""

async def run_critic_agent(movie_metadata: dict, session_id: str = "default") -> EvaluateResponse:
    """Runs the critic agent against the provided movie metadata using LLM with fallback."""
    log = logger.bind(session_id=session_id, agent="critic")
    log.info("Starting critic agent evaluation")
    
    title = movie_metadata.get("title", "Unknown")
    overview = movie_metadata.get("overview", "")
    release_date = movie_metadata.get("release_date", "Unknown")
    
    user_prompt = f"Evaluate the movie: '{title}' ({release_date}). Overview: {overview}"

    try:
        parsed = await generate_json_with_fallback(SYSTEM_PROMPT, user_prompt, temperature=0.3)
        score = float(parsed.get("score", 8.0))
        reasoning = str(parsed.get("reasoning", f"Honestly, '{title}' is a solid cinematic work with strong narrative execution."))
        verdict = str(parsed.get("verdict", "A compelling cinematic effort well worth your time."))
        return EvaluateResponse(score=score, reasoning=reasoning, verdict=verdict)
    except Exception as e:
        log.warning("Critic agent failed, returning fallback evaluation", error=str(e))
        return EvaluateResponse(
            score=8.0,
            reasoning=f"Honestly, '{title}' delivers strong performances and sharp pacing throughout.",
            verdict="A well-crafted film worth watching."
        )
