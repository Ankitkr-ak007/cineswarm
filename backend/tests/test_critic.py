import pytest
import respx
import httpx
from fastapi.testclient import TestClient
from app.main import app
from app.core.tmdb import MovieNotFoundError, TMDBError

from app.core.config import settings

client = TestClient(app)

@pytest.fixture
def mock_env():
    old_tmdb = settings.TMDB_API_KEY
    old_groq = settings.GROQ_API_KEY
    settings.TMDB_API_KEY = "test_tmdb_key"
    settings.GROQ_API_KEY = "test_groq_key"
    yield
    settings.TMDB_API_KEY = old_tmdb
    settings.GROQ_API_KEY = old_groq

@respx.mock
def test_evaluate_critic_success(mock_env):
    # Mock TMDB
    tmdb_route = respx.get(
        "https://api.themoviedb.org/3/search/movie",
        params={"query": "Inception", "include_adult": "false", "language": "en-US", "page": "1"}
    ).respond(
        status_code=200,
        json={"results": [{"title": "Inception", "overview": "A thief who steals corporate secrets...", "release_date": "2010"}]}
    )

    # Mock Groq
    groq_route = respx.post("https://api.groq.com/openai/v1/chat/completions").respond(
        status_code=200,
        json={
            "choices": [{
                "message": {
                    "content": '{"score": 9.5, "reasoning": "A masterpiece of narrative craft and direction. Pacing is relentless.", "verdict": "A must-watch for sci-fi fans."}'
                }
            }]
        }
    )

    response = client.post("/api/v1/agents/critic/evaluate", json={"title": "Inception"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 9.5
    assert data["reasoning"] == "A masterpiece of narrative craft and direction. Pacing is relentless."
    assert data["verdict"] == "A must-watch for sci-fi fans."

@respx.mock
def test_evaluate_critic_not_found(mock_env):
    # Mock TMDB to return empty results
    tmdb_route = respx.get(
        "https://api.themoviedb.org/3/search/movie",
        params={"query": "NonExistentMovie123", "include_adult": "false", "language": "en-US", "page": "1"}
    ).respond(
        status_code=200,
        json={"results": []}
    )

    response = client.post("/api/v1/agents/critic/evaluate", json={"title": "NonExistentMovie123"})
    
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "not found" in data["detail"].lower()

@respx.mock
def test_evaluate_critic_tmdb_error(mock_env):
    # Mock TMDB to return a 500 error
    tmdb_route = respx.get(
        "https://api.themoviedb.org/3/search/movie",
        params={"query": "ErrorMovie", "include_adult": "false", "language": "en-US", "page": "1"}
    ).respond(
        status_code=500
    )

    response = client.post("/api/v1/agents/critic/evaluate", json={"title": "ErrorMovie"})
    
    assert response.status_code == 500
    data = response.json()
    assert "detail" in data
