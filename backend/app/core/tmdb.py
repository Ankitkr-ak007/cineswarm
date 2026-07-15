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
    params = {
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
            
        return data["results"][0]
