import json
from pydantic import BaseModel
from app.core.llm import generate_json_with_fallback
import structlog

logger = structlog.get_logger(__name__)

class ConsensusOutput(BaseModel):
    actual_rating: float = 0.0
    consensus_score: float
    explanation: str
    confidence: str
    recommendations: list[str] = []

def calculate_consensus_score(scores: dict) -> float:
    """
    Calculates consensus score by taking average of active non-zero agent scores.
    """
    valid_scores = []
    for agent, score in scores.items():
        if score is not None and isinstance(score, (int, float)):
            # If data agent score is 0.0 (unrated), ignore it so it doesn't penalize consensus
            if agent == "data" and score <= 0.0:
                continue
            valid_scores.append(float(score))
            
    if not valid_scores:
        return 0.0
        
    return round(sum(valid_scores) / len(valid_scores), 1)

async def run_consensus_agent(movie_metadata: dict, agent_outputs: dict, session_id: str) -> ConsensusOutput:
    """
    Consensus agent:
    Synthesizes the other agents into a final score (deterministic) and an explanation (LLM with fallback).
    """
    log = logger.bind(session_id=session_id, agent="consensus")
    log.info("Starting consensus agent execution")
    
    title = movie_metadata.get("title", "Unknown")
    
    # Extract actual rating from data agent output or metadata
    actual_rating = 0.0
    if "data" in agent_outputs and "actual_rating" in agent_outputs["data"]:
        actual_rating = float(agent_outputs["data"]["actual_rating"] or 0.0)
    elif "vote_average" in movie_metadata:
        actual_rating = float(movie_metadata.get("vote_average") or 0.0)
    actual_rating = round(actual_rating, 1)

    # Extract scores
    scores = {}
    if "critic" in agent_outputs and "score" in agent_outputs["critic"]:
        scores["critic"] = agent_outputs["critic"]["score"]
    if "vibes" in agent_outputs and "score" in agent_outputs["vibes"]:
        scores["vibes"] = agent_outputs["vibes"]["score"]
    if "hidden_gems" in agent_outputs and "score" in agent_outputs["hidden_gems"]:
        scores["hidden_gems"] = agent_outputs["hidden_gems"]["score"]
    if actual_rating > 0:
        scores["data"] = actual_rating

    consensus_score = calculate_consensus_score(scores)
    
    confidence = "high" if len(scores) >= 3 else "low"
    
    system_prompt = """You are Lex, the charismatic moderator and host of the CineSwarm debate.
Synthesize the arguments presented by Roger (the Critic), Aura (the Vibes Analyst), and Pixel (the Hidden Gems scout).
Summarize their conversation and final opinions in a lively, host-like, natural tone (e.g. "Welcome back! Roger and Aura went head-to-head on this one...").
Also, suggest 3 alternative or similar movies for the user to watch next.
Output strictly as JSON: {"explanation": "<host-style summary of the debate>", "recommendations": ["Movie Title 1", "Movie Title 2", "Movie Title 3"]}"""

    user_prompt = f"Movie: {title}\nCalculated Consensus Score: {consensus_score}/10\nTMDB Rating: {actual_rating}/10\nAgent Outputs:\n{json.dumps(agent_outputs, indent=2)}"

    explanation = f"The Swarm has reached consensus on '{title}' with a score of {consensus_score}/10 based on analysis from Roger, Aura, and Pixel."
    recommendations = ["Inception", "Interstellar", "The Dark Knight"]

    try:
        parsed = await generate_json_with_fallback(system_prompt, user_prompt, temperature=0.5)
        explanation = parsed.get("explanation", explanation)
        recommendations = parsed.get("recommendations", recommendations)
    except Exception as e:
        log.warning("LLM synthesis failed in consensus agent, using fallback explanation", error=str(e))

    log.info("Consensus evaluation complete", consensus_score=consensus_score, actual_rating=actual_rating)
    return ConsensusOutput(
        actual_rating=actual_rating,
        consensus_score=consensus_score,
        explanation=explanation,
        confidence=confidence,
        recommendations=recommendations
    )
