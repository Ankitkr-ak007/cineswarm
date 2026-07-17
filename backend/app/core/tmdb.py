import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings

class TMDBError(Exception):
    """Raised when TMDB API call fails."""
    pass

class MovieNotFoundError(Exception):
    """Raised when movie is not found in TMDB."""
    pass

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.RequestError, TMDBError))
)
async def fetch_movie_metadata(title: str) -> dict:
    """Fetch movie metadata from TMDB by title. Takes the top match."""
    if not settings.TMDB_API_KEY:
        raise ValueError("TMDB_API_KEY is not set")
    
    url = "https://api.themoviedb.org/3/search/movie"
    params: dict[str, str | int] = {
        "api_key": settings.TMDB_API_KEY,
        "query": title,
        "include_adult": "false",
        "language": "en-US",
        "page": 1
    }
    headers = {
        "accept": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            if e.response.status_code >= 500:
                raise TMDBError(f"TMDB Server Error: {e.response.status_code}")
            elif e.response.status_code == 401 or e.response.status_code == 403:
                raise ValueError("Invalid TMDB API Key")
            else:
                raise TMDBError(f"HTTP Error: {e.response.status_code}")
        except httpx.RequestError as e:
            raise TMDBError(f"Request Error: {str(e)}")

        data = response.json()
        if not data.get("results"):
            raise MovieNotFoundError(f"Movie '{title}' not found.")
            
        movie_id = data["results"][0]["id"]
        
        # Now fetch details with release_dates to get certification
        details_url = f"https://api.themoviedb.org/3/movie/{movie_id}"
        details_params = {
            "api_key": settings.TMDB_API_KEY,
            "append_to_response": "release_dates",
            "language": "en-US"
        }
        
        try:
            details_resp = await client.get(details_url, params=details_params, headers=headers, timeout=10.0)
            details_resp.raise_for_status()
        except httpx.HTTPError:
            # Fallback to just the search result if details fail
            return data["results"][0]
            
        details_data = details_resp.json()
        
        # Extract US certification
        certification = None
        release_dates = details_data.get("release_dates", {}).get("results", [])
        for rd in release_dates:
            if rd.get("iso_3166_1") == "US":
                for release in rd.get("release_dates", []):
                    if release.get("certification"):
                        certification = release.get("certification")
                        break
                if certification:
                    break
                    
        details_data["certification"] = certification
        return details_data

async def suggest_movies_from_llm(mood: str, genres: list[str], content_mode: str) -> list[str]:
    """Ask Gemini to suggest 5 movie titles that fit the mood and genres."""
    if not settings.GEMINI_API_KEY:
        return ["Toy Story", "Inception", "Finding Nemo", "Inside Out"]
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    
    genres_str = ", ".join(genres)
    system_prompt = "You are a movie recommendation assistant. Suggest 5 real, popular movies matching the user's request. Output strictly as a JSON array of strings: [\"Movie 1\", \"Movie 2\", ...]"
    user_prompt = f"Mood/Vibe: {mood}\nGenres: {genres_str}\nContent Mode: {content_mode} (if 'kids', only suggest family-friendly movies rating G/PG)"
    
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": system_prompt + "\n\n" + user_prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.7
        }
    }
    
    try:
        import json
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            titles = json.loads(content)
            if isinstance(titles, list):
                return [str(t) for t in titles]
    except Exception:
        pass
    
    # Fallback list if Gemini fails
    return ["Toy Story", "Inception", "Finding Nemo", "Inside Out"]

