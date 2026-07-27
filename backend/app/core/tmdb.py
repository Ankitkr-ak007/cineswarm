import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
from app.db.supabase import get_supabase_client
import structlog

logger = structlog.get_logger(__name__)

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
async def fetch_movie_metadata(title: str, year: int | None = None, media_type: str = "all") -> dict:
    """Fetch movie or TV show metadata from TMDB by title and optional year."""
    # Check cache first
    supabase = get_supabase_client()
    if supabase and not year:
        try:
            res = supabase.table("movies").select("*").ilike("title", title).execute()
            if res.data:
                genres_raw = movie.get("genres")
                genres_data = genres_raw if isinstance(genres_raw, dict) else {}
                genres_list = genres_raw if isinstance(genres_raw, list) else (genres_data.get("genres") if isinstance(genres_data, dict) else [])
                
                metadata = {
                    "id": movie.get("tmdb_id"),
                    "title": movie.get("title"),
                    "overview": movie.get("overview"),
                    "release_date": movie.get("release_date"),
                    "poster_path": movie.get("poster_path"),
                    "backdrop_path": genres_data.get("backdrop_path") if isinstance(genres_data, dict) else None,
                    "credits": genres_data.get("credits") if isinstance(genres_data, dict) else None,
                    "videos": genres_data.get("videos") if isinstance(genres_data, dict) else None,
                    "watch/providers": genres_data.get("watch/providers") if isinstance(genres_data, dict) else None,
                    "similar": genres_data.get("similar") if isinstance(genres_data, dict) else None,
                    "release_dates": genres_data.get("release_dates") if isinstance(genres_data, dict) else None,
                    "certification": movie.get("certification"),
                    "genres": genres_list,
                    "vote_average": genres_data.get("vote_average") if isinstance(genres_data, dict) and "vote_average" in genres_data else (movie.get("vote_average") or 0.0),
                    "vote_count": genres_data.get("vote_count") if isinstance(genres_data, dict) and "vote_count" in genres_data else (movie.get("vote_count") or 0),
                    "popularity": genres_data.get("popularity") if isinstance(genres_data, dict) and "popularity" in genres_data else (movie.get("popularity") or 0.0),
                    "media_type": genres_data.get("media_type", "movie") if isinstance(genres_data, dict) else "movie",
                    "number_of_seasons": genres_data.get("number_of_seasons") if isinstance(genres_data, dict) else None,
                    "number_of_episodes": genres_data.get("number_of_episodes") if isinstance(genres_data, dict) else None,
                }
                logger.info("Found cached content in database by title", title=title, id=metadata["id"])
                return metadata
        except Exception as e:
            logger.warning("Failed to check movies cache by title", error=str(e))

    if not settings.TMDB_API_KEY:
        raise ValueError("TMDB_API_KEY is not set")
    
    headers = {"accept": "application/json"}
    
    async with httpx.AsyncClient() as client:
        search_endpoint = "search/multi" if media_type == "all" else f"search/{media_type}"
        url = f"https://api.themoviedb.org/3/{search_endpoint}"
        params: dict[str, str | int] = {
            "api_key": settings.TMDB_API_KEY,
            "query": title,
            "include_adult": "false",
            "language": "en-US",
            "page": 1
        }
        if year:
            if media_type == "movie":
                params["primary_release_year"] = year
            elif media_type == "tv":
                params["first_air_date_year"] = year
            else:
                params["year"] = year

        try:
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            if e.response.status_code >= 500:
                raise TMDBError(f"TMDB Server Error: {e.response.status_code}")
            elif e.response.status_code in (401, 403):
                raise ValueError("Invalid TMDB API Key")
            else:
                raise TMDBError(f"HTTP Error: {e.response.status_code}")
        except httpx.RequestError as e:
            raise TMDBError(f"Request Error: {str(e)}")

        data = response.json()
        results = data.get("results", [])
        valid_results = [r for r in results if r.get("media_type") in ("movie", "tv") or "title" in r or "name" in r]
        
        if year:
            year_str = str(year)
            matching_year_results = [
                r for r in valid_results
                if (r.get("release_date", "").startswith(year_str) or r.get("first_air_date", "").startswith(year_str))
            ]
            if matching_year_results:
                valid_results = matching_year_results
        
        if not valid_results and media_type != "movie":
            # Fallback search via movie endpoint if multi/tv returns nothing
            fb_url = "https://api.themoviedb.org/3/search/movie"
            fb_resp = await client.get(fb_url, params=params, headers=headers, timeout=10.0)
            if fb_resp.status_code == 200 and fb_resp.json().get("results"):
                valid_results = fb_resp.json()["results"]
                if year:
                    year_str = str(year)
                    matching_fb = [r for r in valid_results if r.get("release_date", "").startswith(year_str)]
                    if matching_fb:
                        valid_results = matching_fb

        if not valid_results:
            raise MovieNotFoundError(f"Content '{title}' ({year or 'any year'}) not found.")
            
        top_match = valid_results[0]
        item_id = top_match["id"]
        detected_type = top_match.get("media_type") or ("tv" if ("first_air_date" in top_match or media_type == "tv") else "movie")
        
        if detected_type == "tv":
            details_url = f"https://api.themoviedb.org/3/tv/{item_id}"
            append_target = "content_ratings,credits,videos,watch/providers,similar"
        else:
            details_url = f"https://api.themoviedb.org/3/movie/{item_id}"
            append_target = "release_dates,credits,videos,watch/providers,similar"
            
        details_params = {
            "api_key": settings.TMDB_API_KEY,
            "append_to_response": append_target,
            "language": "en-US"
        }
        
        try:
            details_resp = await client.get(details_url, params=details_params, headers=headers, timeout=10.0)
            details_resp.raise_for_status()
            details_data = details_resp.json()
        except httpx.HTTPError:
            details_data = top_match

        # Normalize title, release date, certification & media_type
        normalized_title = details_data.get("title") or details_data.get("name") or details_data.get("original_name") or title
        normalized_date = details_data.get("release_date") or details_data.get("first_air_date")
        
        certification = None
        if detected_type == "tv":
            ratings = details_data.get("content_ratings", {}).get("results", [])
            for r in ratings:
                if r.get("iso_3166_1") in ("US", "IN"):
                    if r.get("rating"):
                        certification = r.get("rating")
                        break
        else:
            release_dates = details_data.get("release_dates", {}).get("results", [])
            for rd in release_dates:
                if rd.get("iso_3166_1") == "US":
                    for release in rd.get("release_dates", []):
                        if release.get("certification"):
                            certification = release.get("certification")
                            break
                    if certification:
                        break

        details_data["title"] = normalized_title
        details_data["release_date"] = normalized_date
        details_data["certification"] = certification
        details_data["media_type"] = detected_type

        # Store in database cache
        if supabase:
            try:
                genres_cache = {
                    "genres": details_data.get("genres"),
                    "credits": details_data.get("credits"),
                    "videos": details_data.get("videos"),
                    "watch/providers": details_data.get("watch/providers"),
                    "similar": details_data.get("similar"),
                    "release_dates": details_data.get("release_dates"),
                    "backdrop_path": details_data.get("backdrop_path"),
                    "vote_average": details_data.get("vote_average"),
                    "vote_count": details_data.get("vote_count"),
                    "popularity": details_data.get("popularity"),
                    "media_type": detected_type,
                    "number_of_seasons": details_data.get("number_of_seasons"),
                    "number_of_episodes": details_data.get("number_of_episodes"),
                }
                supabase.table("movies").upsert({
                    "tmdb_id": details_data.get("id"),
                    "title": normalized_title,
                    "overview": details_data.get("overview"),
                    "genres": genres_cache,
                    "release_date": normalized_date,
                    "certification": certification,
                    "adult": details_data.get("adult", False),
                    "poster_path": details_data.get("poster_path")
                }).execute()
            except Exception as cache_err:
                logger.warning("Failed to save content to database cache", error=str(cache_err))

        return details_data

async def fetch_movie_details_by_id(movie_id: int) -> dict:
    """Fetch full movie details from TMDB by movie ID (with appends)."""
    # Check cache first
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("movies").select("*").eq("tmdb_id", movie_id).execute()
            if res.data:
                movie = res.data[0]
                genres_data = movie.get("genres") or {}
                if isinstance(genres_data, dict) and "credits" in genres_data:
                    metadata = {
                        "id": movie.get("tmdb_id"),
                        "title": movie.get("title"),
                        "overview": movie.get("overview"),
                        "release_date": str(movie.get("release_date")) if movie.get("release_date") else None,
                        "poster_path": movie.get("poster_path"),
                        "backdrop_path": genres_data.get("backdrop_path"),
                        "credits": genres_data.get("credits"),
                        "videos": genres_data.get("videos"),
                        "watch/providers": genres_data.get("watch/providers"),
                        "similar": genres_data.get("similar"),
                        "release_dates": genres_data.get("release_dates"),
                        "certification": movie.get("certification"),
                        "genres": genres_data.get("genres") if isinstance(genres_data, dict) else movie.get("genres"),
                        "vote_average": genres_data.get("vote_average") if isinstance(genres_data, dict) and "vote_average" in genres_data else (movie.get("vote_average") or 0.0),
                        "vote_count": genres_data.get("vote_count") if isinstance(genres_data, dict) and "vote_count" in genres_data else (movie.get("vote_count") or 0),
                        "popularity": genres_data.get("popularity") if isinstance(genres_data, dict) and "popularity" in genres_data else (movie.get("popularity") or 0.0),
                    }
                    logger.info("Found cached movie in database by ID", id=movie_id)
                    return metadata
        except Exception as e:
            logger.warning("Failed to check movies cache by ID", error=str(e))

    if not settings.TMDB_API_KEY:
        raise ValueError("TMDB_API_KEY is not set")
        
    url = f"https://api.themoviedb.org/3/movie/{movie_id}"
    params = {
        "api_key": settings.TMDB_API_KEY,
        "append_to_response": "release_dates,credits,videos,watch/providers,similar",
        "language": "en-US"
    }
    headers = {"accept": "application/json"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers, timeout=10.0)
        response.raise_for_status()
        details_data = response.json()
        
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

        # Store in database cache
        if supabase:
            try:
                genres_cache = {
                    "genres": details_data.get("genres"),
                    "credits": details_data.get("credits"),
                    "videos": details_data.get("videos"),
                    "watch/providers": details_data.get("watch/providers"),
                    "similar": details_data.get("similar"),
                    "release_dates": details_data.get("release_dates"),
                    "backdrop_path": details_data.get("backdrop_path"),
                    "vote_average": details_data.get("vote_average"),
                    "vote_count": details_data.get("vote_count"),
                    "popularity": details_data.get("popularity")
                }
                supabase.table("movies").upsert({
                    "tmdb_id": details_data.get("id"),
                    "title": details_data.get("title"),
                    "overview": details_data.get("overview"),
                    "genres": genres_cache,
                    "release_date": details_data.get("release_date"),
                    "certification": details_data.get("certification"),
                    "adult": details_data.get("adult"),
                    "poster_path": details_data.get("poster_path")
                }).execute()
            except Exception as cache_err:
                logger.warning("Failed to save movie to database cache", error=str(cache_err))

        return details_data

def extract_cast(movie_metadata: dict) -> list[str]:
    cast_list = movie_metadata.get("credits", {}).get("cast", [])[:5]
    return [member.get("name") for member in cast_list if isinstance(member, dict) and member.get("name")]

def extract_trailer_key(movie_metadata: dict) -> str | None:
    videos = movie_metadata.get("videos", {}).get("results", [])
    for v in videos:
        if isinstance(v, dict) and v.get("site") == "YouTube" and v.get("type") in ["Trailer", "Teaser"]:
            return v.get("key")
    return None

from urllib.parse import quote_plus

def _build_provider_link(provider_name: str, movie_title: str, tmdb_link: str | None) -> str:
    name_lower = provider_name.lower()
    query = quote_plus(movie_title)
    
    if "youtube" in name_lower or "google" in name_lower:
        return f"https://www.youtube.com/results?search_query=watch+{query}+full+movie+official"
    elif "netflix" in name_lower:
        return f"https://www.netflix.com/search?q={query}"
    elif "prime" in name_lower or "amazon" in name_lower:
        return f"https://www.primevideo.com/search/ref=atv_nb_sr?phrase={query}"
    elif "hotstar" in name_lower or "disney" in name_lower:
        return f"https://www.hotstar.com/in/explore?search={query}"
    elif "jiocinema" in name_lower or "jio" in name_lower:
        return f"https://www.jiocinema.com/search/{query}"
    elif "zee5" in name_lower or "zee" in name_lower:
        return f"https://www.zee5.com/search?q={query}"
    elif "apple" in name_lower:
        return f"https://tv.apple.com/search?term={query}"
    elif tmdb_link:
        return tmdb_link
    else:
        return f"https://www.google.com/search?q=watch+{query}+on+{quote_plus(provider_name)}"

def extract_watch_providers(movie_metadata: dict, region: str = "IN") -> list[dict]:
    results = movie_metadata.get("watch/providers", {}).get("results", {})
    region_data = results.get(region, {})
    tmdb_link = region_data.get("link")
    movie_title = movie_metadata.get("title", "")
    
    # Combine flatrate (subscription), rent, buy, and free options for region
    raw_providers = (
        region_data.get("flatrate", []) + 
        region_data.get("rent", []) + 
        region_data.get("buy", []) + 
        region_data.get("free", [])
    )
    
    output = []
    seen_names = set()
    for p in raw_providers:
        if isinstance(p, dict):
            p_name = p.get("provider_name") or "Watch Provider"
            if p_name in seen_names:
                continue
            seen_names.add(p_name)
            link = _build_provider_link(p_name, movie_title, tmdb_link)
            output.append({
                "name": p_name,
                "logo_path": p.get("logo_path"),
                "link": link
            })
        
    return output

def extract_similar_movies(movie_metadata: dict) -> list[dict]:
    similar = movie_metadata.get("similar", {}).get("results", [])[:6]
    return [
        {
            "id": m.get("id"),
            "title": m.get("title") or m.get("name") or m.get("original_name"),
            "poster_path": m.get("poster_path")
        }
        for m in similar if isinstance(m, dict)
    ]

async def suggest_movies_from_llm(mood: str, genres: list[str], content_mode: str, media_type: str = "all", industry: str = "all", year: int | str | None = None) -> list[str]:
    """Ask LLM to suggest 5 movie or TV show titles fitting mood, genres, media type, film industry, and release year/era."""
    from app.core.llm import generate_json_with_fallback
    
    genres_str = ", ".join(genres)
    if media_type == "tv":
        type_str = "TV shows/series"
    elif media_type == "movie":
        type_str = "movies"
    else:
        type_str = "movies or TV shows"
        
    industry_desc = ""
    if industry == "bollywood":
        industry_desc = "specifically from Bollywood / Hindi language cinema or Indian web series"
    elif industry == "south_indian":
        industry_desc = "specifically from South Indian cinema (Tamil, Telugu, Malayalam, Kannada, or Pan-India cinema)"
    elif industry == "hollywood":
        industry_desc = "specifically from Hollywood / English language films or Western TV series"
    elif industry == "anime_kdrama":
        industry_desc = "specifically from Asian cinema, K-dramas (Korean dramas), or Japanese anime"
        
    year_desc = f"\nRelease Year / Era Preference: {year}" if year else ""
    system_prompt = f'You are an entertainment recommendation assistant. Suggest 5 real, popular {type_str} {industry_desc} matching the user\'s request. Output strictly as JSON: {{"titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]}}'
    user_prompt = f"Mood/Vibe: {mood}\nGenres: {genres_str}\nIndustry/Region: {industry}{year_desc}\nContent Mode: {content_mode} (if 'kids', only suggest family-friendly content)\nMedia Type Preference: {media_type}"
    
    try:
        parsed = await generate_json_with_fallback(system_prompt, user_prompt, temperature=0.8)
        if isinstance(parsed, dict) and "titles" in parsed and isinstance(parsed["titles"], list):
            return [str(t) for t in parsed["titles"]]
        elif isinstance(parsed, list):
            return [str(t) for t in parsed]
    except Exception as e:
        logger.warning("LLM recommendation failed, using defaults", error=str(e))
    
    if industry == "bollywood":
        return ["3 Idiots", "Dangal", "Sacred Games", "Pathaan", "Mirzapur", "Stree 2", "Zindagi Na Milegi Dobara"]
    elif industry == "south_indian":
        return ["RRR", "K.G.F: Chapter 1", "Pushpa: The Rise", "Jailer", "Manjummel Boys", "Kantara", "Leo", "Baahubali"]
    elif industry == "anime_kdrama":
        return ["Squid Game", "Attack on Titan", "Crash Landing on You", "Demon Slayer", "Parasite", "Death Note"]
    elif media_type == "tv":
        return ["Stranger Things", "Breaking Bad", "The Office", "Game of Thrones", "Chernobyl"]
    return ["Inception", "Interstellar", "The Dark Knight", "Oppenheimer", "Toy Story"]

