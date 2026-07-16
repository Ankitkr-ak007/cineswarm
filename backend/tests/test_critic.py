import pytest
import respx
from app.agents.critic import run_critic_agent
from app.core.config import settings

@pytest.fixture
def mock_env():
    old_tmdb = settings.TMDB_API_KEY
    old_groq = settings.GROQ_API_KEY
    settings.TMDB_API_KEY = "test_tmdb_key"
    settings.GROQ_API_KEY = "test_groq_key"
    yield
    settings.TMDB_API_KEY = old_tmdb
    settings.GROQ_API_KEY = old_groq

@pytest.mark.asyncio
@respx.mock
async def test_evaluate_critic_success(mock_env):
    # Mock Groq
    respx.post("https://api.groq.com/openai/v1/chat/completions").respond(
        status_code=200,
        json={
            "choices": [{
                "message": {
                    "content": '{"score": 9.5, "reasoning": "A masterpiece of narrative craft and direction. Pacing is relentless.", "verdict": "A must-watch for sci-fi fans."}'
                }
            }]
        }
    )

    metadata = {"title": "Inception", "overview": "A thief who steals corporate secrets..."}
    res = await run_critic_agent(metadata, "test-session")
    
    assert res.score == 9.5
    assert res.reasoning == "A masterpiece of narrative craft and direction. Pacing is relentless."
    assert res.verdict == "A must-watch for sci-fi fans."
