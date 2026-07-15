import logging

logger = logging.getLogger(__name__)

def is_safe_for_kids(movie_metadata: dict) -> bool:
    """
    Applied before any agent sees a candidate movie.
    - Baseline: adult = false
    - Kids Mode: certification restricted to G, PG only. Horror genre excluded.
    - Missing/ambiguous certification -> excluded (fail-safe).
    """
    # 1. Baseline adult check
    if movie_metadata.get("adult", False):
        logger.warning(f"Safety check failed: Adult flag is true for '{movie_metadata.get('title')}'")
        return False
        
    # 2. Certification check (we need to parse it if available, TMDB search doesn't return it natively without append_to_response=releases, but let's assume it's passed if we have it)
    # The prompt says: "Missing/ambiguous certification -> excluded in Kids Mode by default (fail-safe, not fail-open)"
    certification = movie_metadata.get("certification")
    if not certification or certification.upper() not in ["G", "PG"]:
        logger.warning(f"Safety check failed: Certification '{certification}' not allowed or missing.")
        return False
        
    # 3. Genre exclusion (Horror)
    # TMDB uses genre_ids in the search response, but let's check text if genres are joined, or check for Horror ID (27)
    genre_ids = movie_metadata.get("genre_ids", [])
    if 27 in genre_ids: # 27 is Horror in TMDB
        logger.warning("Safety check failed: Horror genre detected.")
        return False
        
    genres = movie_metadata.get("genres", [])
    if isinstance(genres, list):
        genre_names = [g.get("name", "").lower() for g in genres if isinstance(g, dict)]
        if "horror" in genre_names:
            logger.warning("Safety check failed: Horror genre detected.")
            return False

    # 4. Keyword blocklist as backstop
    overview = movie_metadata.get("overview", "").lower()
    title = movie_metadata.get("title", "").lower()
    blocklist = ["murder", "sex", "gore", "blood", "kill", "drugs", "violence", "porn"]
    
    for word in blocklist:
        if word in overview or word in title:
            logger.warning(f"Safety check failed: Blocklist keyword '{word}' detected.")
            return False
            
    return True
