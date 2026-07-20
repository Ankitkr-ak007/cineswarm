import httpx
from pydantic import BaseModel
from app.core.config import settings
from app.core.llm import generate_json_with_fallback
from app.db.supabase import get_supabase_client
import structlog

logger = structlog.get_logger(__name__)

async def get_gemini_embedding(text: str) -> list[float]:
    if not text or not settings.GEMINI_API_KEY:
        return [0.0] * 768
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={settings.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": 768
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data["embedding"]["values"]
    except Exception as e:
        logger.warning("Gemini embedding failed, using zero vector fallback", error=str(e))
        return [0.0] * 768

class HiddenGemsOutput(BaseModel):
    score: float
    reasoning: str
    similar_to: str = ""

async def run_hidden_gems_agent(movie_metadata: dict, outputs: dict, session_id: str) -> HiddenGemsOutput:
    """
    Hidden Gems agent: Vector similarity over plot embeddings vs. user's liked movies.
    Uses LLM with dual provider fallback (Groq / Gemini) to evaluate.
    """
    log = logger.bind(session_id=session_id, agent="hidden_gems")
    log.info("Starting hidden gems agent execution")
    
    title = movie_metadata.get("title", "Unknown")
    overview = movie_metadata.get("overview", "")
    tmdb_id = movie_metadata.get("id", 0)

    # 1. Generate embedding for current movie
    embedding = await get_gemini_embedding(overview)

    # 2. Persist to DB
    supabase = get_supabase_client()
    similar_movies_str = "No similar movies found."
    
    if supabase and tmdb_id:
        try:
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
            supabase.table("movies").upsert(movie_data).execute()
            
            match_res = supabase.rpc("match_movies", {
                "query_embedding": embedding,
                "match_threshold": 0.5,
                "match_count": 3
            }).execute()
            
            matches = match_res.data
            if isinstance(matches, list):
                matches = [m for m in matches if isinstance(m, dict) and m.get("tmdb_id") != tmdb_id]
                if matches:
                    similar_titles = [m.get("title") for m in matches if isinstance(m, dict) and "title" in m]
                    similar_movies_str = ", ".join(str(t) for t in similar_titles)
        except Exception as e:
            log.warning("Database operation failed in hidden gems", error=str(e))

    # 3. Call LLM to evaluate
    system_prompt = """You are Pixel, a friendly, enthusiastic, and curious 'Hidden Gems' scout.
Evaluate the candidate movie to see if it's an underappreciated masterpiece or has strong thematic links to other great movies.
Speak like a real human: passionate, conversational, and knowledgeable about niche cinema.
Look at what Roger (the Critic) and Aura (the Vibes Analyst) have said about the movie. Feel free to reference their opinions in your review (e.g. 'Roger has some valid critique on the pacing, but I think...', or 'I agree with Aura's vibe check, but what makes this a real gem is...').
Output strictly as JSON: {"score": <1-10>, "reasoning": "<natural, conversational hidden gem analysis, reacting to Roger and/or Aura if applicable>", "similar_to": "<movie titles>"}"""

    critic_output = outputs.get("critic", {})
    critic_critique = critic_output.get("reasoning", "")
    critic_score = critic_output.get("score")
    
    vibes_output = outputs.get("vibes", {})
    vibes_critique = vibes_output.get("reasoning", "")
    vibes_score = vibes_output.get("score")
    
    debate_context = ""
    if critic_critique:
        debate_context += f"\n\nRoger (the Critic) gave this movie a {critic_score}/10 and said: '{critic_critique}'"
    if vibes_critique:
        debate_context += f"\n\nAura (the Vibes Analyst) gave this movie a {vibes_score}/10 and said: '{vibes_critique}'"

    user_prompt = f"Evaluate the movie: '{title}'. Overview: {overview}\nSimilar movies found in our database: {similar_movies_str}{debate_context}"

    fallback_score = 8.0
    fallback_reasoning = f"'{title}' is a standout entry that blends thematic depth with memorable storytelling."

    try:
        parsed = await generate_json_with_fallback(system_prompt, user_prompt, temperature=0.5)
        score = float(parsed.get("score", fallback_score))
        reasoning = str(parsed.get("reasoning", fallback_reasoning))
        similar_to = str(parsed.get("similar_to") or similar_movies_str)
        log.info("Hidden gems evaluation complete", score=score)
        return HiddenGemsOutput(score=score, reasoning=reasoning, similar_to=similar_to)
    except Exception as e:
        log.warning("LLM evaluation failed in hidden gems agent, using fallback", error=str(e))
        return HiddenGemsOutput(score=fallback_score, reasoning=fallback_reasoning, similar_to=similar_movies_str)
