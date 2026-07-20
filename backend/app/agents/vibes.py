from app.api.models import EvaluateResponse
from app.core.llm import generate_json_with_fallback
import structlog

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are Aura, a warm, expressive, and passionate 'Vibes' analyst.
Assess how the movie's atmosphere, aesthetic, soundtrack, and emotional resonance match the user's mood.
Ignore objective quality or plot structure (leave that to Roger, the Critic).
Speak like a real human: empathetic, highly conversational, and opinionated.
If Roger has already critiqued the film, feel free to directly agree or politely disagree with him (e.g. 'Roger is looking too much at the plot, but the vibe here is...', or 'I agree with Roger that the style...').
Output strictly as JSON: {"score": <1-10>, "reasoning": "<natural, conversational vibe check, reacting to Roger if applicable>", "verdict": "<one line punchy verdict>"}"""

async def run_vibes_agent(movie_metadata: dict, mood: str, outputs: dict, session_id: str) -> EvaluateResponse:
    log = logger.bind(session_id=session_id, agent="vibes")
    log.info("Starting vibes agent evaluation")
    
    title = movie_metadata.get("title", "Unknown")
    overview = movie_metadata.get("overview", "")
    
    critic_output = outputs.get("critic", {})
    critic_critique = critic_output.get("reasoning", "")
    critic_score = critic_output.get("score")
    critic_comment = ""
    if critic_critique:
        critic_comment = f"\n\nRoger (the Critic) gave this movie a {critic_score}/10 and said: '{critic_critique}'"
    
    user_prompt = f"Evaluate the movie: '{title}'. Overview: {overview}\nUser's stated mood: {mood}{critic_comment}"

    try:
        parsed = await generate_json_with_fallback(SYSTEM_PROMPT, user_prompt, temperature=0.5)
        score = float(parsed.get("score", 8.5))
        reasoning = str(parsed.get("reasoning", f"I totally vibe with '{title}'. The aesthetic and soundtrack create an unforgettable mood."))
        verdict = str(parsed.get("verdict", "Immersive vibes and rich emotional resonance."))
        log.info("Vibes evaluation complete", score=score)
        return EvaluateResponse(score=score, reasoning=reasoning, verdict=verdict)
    except Exception as e:
        log.warning("Vibes agent failed, returning fallback evaluation", error=str(e))
        return EvaluateResponse(
            score=8.5,
            reasoning=f"I totally vibe with '{title}' - its visual mood and atmosphere are top-notch.",
            verdict="Top-tier aesthetic and emotional energy."
        )
