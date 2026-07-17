import json
import httpx
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)

class ConsensusOutput(BaseModel):
    consensus_score: float
    explanation: str
    confidence: str
    recommendations: list[str] = []

class GeminiError(Exception):
    pass

def calculate_consensus_score(agent_scores: dict, weights: dict) -> float:
    """
    Deterministic consensus score calculation:
    consensus_score = Σ(agent_score_i × weight_i) / Σ(weight_i)
    """
    total_weighted_score = 0.0
    total_weight = 0.0
    
    for agent, score in agent_scores.items():
        if score is not None:
            weight = weights.get(agent, 0.25)
            total_weighted_score += score * weight
            total_weight += weight
            
    if total_weight == 0:
        return 0.0
        
    return round(total_weighted_score / total_weight, 1)

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=2, min=4, max=30),
    retry=retry_if_exception_type((httpx.RequestError, GeminiError))
)
async def run_consensus_agent(movie_metadata: dict, agent_outputs: dict, session_id: str) -> ConsensusOutput:
    """
    Consensus agent:
    Synthesizes the other agents into a final score (deterministic) and an explanation (LLM).
    Graceful degradation is handled by graph.py (only successful agents are in agent_outputs).
    """
    log = logger.bind(session_id=session_id, agent="consensus")
    log.info("Starting consensus agent execution")
    
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
        
    title = movie_metadata.get("title", "Unknown")
    
    # Extract scores
    scores = {}
    if "critic" in agent_outputs and "score" in agent_outputs["critic"]:
        scores["critic"] = agent_outputs["critic"]["score"]
    if "vibes" in agent_outputs and "score" in agent_outputs["vibes"]:
        scores["vibes"] = agent_outputs["vibes"]["score"]
    if "hidden_gems" in agent_outputs and "score" in agent_outputs["hidden_gems"]:
        scores["hidden_gems"] = agent_outputs["hidden_gems"]["score"]
    if "data" in agent_outputs and "actual_rating" in agent_outputs["data"]:
        # TMDB is out of 10, just like our scores
        scores["data"] = agent_outputs["data"]["actual_rating"]
        
    # Default weights stub (0.25 each)
    weights = {"critic": 0.25, "vibes": 0.25, "hidden_gems": 0.25, "data": 0.25}
    
    consensus_score = calculate_consensus_score(scores, weights)
    
    # Determine confidence based on how many agents succeeded
    expected_agents = 4
    actual_agents = len(scores)
    confidence = "high"
    if actual_agents < expected_agents:
        confidence = "low"
        
    system_prompt = """You are Lex, the charismatic moderator and host of the CineSwarm debate.
Synthesize the arguments presented by Roger (the Critic), Aura (the Vibes Analyst), and Pixel (the Hidden Gems scout).
Summarize their conversation and final opinions in a lively, host-like, natural tone (e.g. "Welcome back! Roger and Aura went head-to-head on this one...").
Also, suggest 3 alternative or similar movies for the user to watch next.
Output strictly as JSON: {"explanation": "<host-style summary of the debate>", "recommendations": ["Movie Title 1", "Movie Title 2", "Movie Title 3"]}"""

    user_prompt = f"Movie: {title}\nCalculated Consensus Score: {consensus_score}/10\nAgent Outputs:\n{json.dumps(agent_outputs, indent=2)}"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
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
            explanation = parsed.get("explanation", "Consensus reached.")
            recommendations = parsed.get("recommendations", [])
            
            log.info("Consensus evaluation complete", score=consensus_score, confidence=confidence)
            return ConsensusOutput(
                consensus_score=consensus_score,
                explanation=explanation,
                confidence=confidence,
                recommendations=recommendations
            )
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            log.error("JSON decode error", error=str(e), data=data)
            raise GeminiError(f"Failed to parse JSON: {e}")
