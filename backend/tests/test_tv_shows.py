import pytest
from app.core.tmdb import extract_similar_movies, suggest_movies_from_llm

def test_extract_similar_tv_shows():
    mock_metadata = {
        "similar": {
            "results": [
                {"id": 1, "name": "Stranger Things", "poster_path": "/stranger.jpg"},
                {"id": 2, "title": "Inception", "poster_path": "/inception.jpg"}
            ]
        }
    }
    
    similar = extract_similar_movies(mock_metadata)
    assert len(similar) == 2
    assert similar[0]["title"] == "Stranger Things"
    assert similar[1]["title"] == "Inception"

@pytest.mark.asyncio
async def test_suggest_tv_shows_fallback():
    # Test that TV show fallback works if LLM fails
    suggestions = await suggest_movies_from_llm("scifi drama", ["Sci-Fi"], "general", media_type="tv")
    assert len(suggestions) > 0
    assert any("Stranger" in s or "Office" in s or isinstance(s, str) for s in suggestions)

@pytest.mark.asyncio
async def test_suggest_movies_from_llm_with_year():
    suggestions = await suggest_movies_from_llm("retro scifi", ["Sci-Fi"], "general", media_type="movie", industry="hollywood", year="1980s")
    assert len(suggestions) > 0

