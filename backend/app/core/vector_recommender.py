import math
from typing import Any

ALL_GENRES = [
    "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", 
    "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", 
    "Romance", "Science Fiction", "Sci-Fi", "TV Movie", "Thriller", "War", "Western"
]

GENRE_INDEX_MAP = {g.lower(): i for i, g in enumerate(ALL_GENRES)}
FEATURE_DIM = len(ALL_GENRES) + 4  # 20 genres + TV_flag + Movie_flag + Recent_era + Rating_norm


def encode_item_vector(item_metadata: dict) -> list[float]:
    """
    Encodes a movie or TV show metadata dict into a normalized feature vector.
    Vector layout:
    - [0:20]: One-hot / weighted genre presence
    - [20]: Is TV show (1.0 or 0.0)
    - [21]: Is Movie (1.0 or 0.0)
    - [22]: Release Era score (recent > 2018 = 1.0, 2005-2018 = 0.7, older = 0.4)
    - [23]: TMDB Normalized Rating (vote_average / 10.0)
    """
    vec = [0.0] * FEATURE_DIM
    
    # 1. Genres
    genres = item_metadata.get("genres", [])
    if isinstance(genres, list):
        for g in genres:
            g_name = g.get("name", "").lower() if isinstance(g, dict) else str(g).lower()
            if g_name in GENRE_INDEX_MAP:
                vec[GENRE_INDEX_MAP[g_name]] = 1.0
            elif "sci-fi" in g_name or "science" in g_name:
                if "sci-fi" in GENRE_INDEX_MAP:
                    vec[GENRE_INDEX_MAP["sci-fi"]] = 1.0
                
    # 2. Media Type
    media_type = item_metadata.get("media_type", "movie")
    if media_type == "tv":
        vec[20] = 1.0
    else:
        vec[21] = 1.0
        
    # 3. Release Era score
    release_date = item_metadata.get("release_date") or ""
    if release_date and len(str(release_date)) >= 4 and str(release_date)[:4].isdigit():
        year = int(str(release_date)[:4])
        if year >= 2018:
            vec[22] = 1.0
        elif year >= 2005:
            vec[22] = 0.7
        else:
            vec[22] = 0.4
    else:
        vec[22] = 0.5
        
    # 4. Rating score
    vote_avg = item_metadata.get("vote_average") or 7.5
    try:
        vec[23] = min(1.0, max(0.0, float(vote_avg) / 10.0))
    except (ValueError, TypeError):
        vec[23] = 0.75
        
    return _normalize_vector(vec)


def _normalize_vector(vec: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(x * x for x in vec))
    if magnitude == 0:
        return vec
    return [x / magnitude for x in vec]


def calculate_cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """
    Calculates Cosine Similarity between two N-dimensional vectors:
    CosineSim(A, B) = (A . B) / (||A|| * ||B||)
    """
    if len(vec_a) != len(vec_b):
        return 0.5
        
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    
    if mag_a == 0 or mag_b == 0:
        return 0.5
        
    sim = dot_product / (mag_a * mag_b)
    return max(0.0, min(1.0, float(sim)))


def build_user_profile_vector(favorites: list[dict], feedback_list: list[dict]) -> list[float]:
    """
    Learns a user preference vector from interaction history:
    - Favorites: weight +1.0
    - Thumbs Up: weight +0.8
    - Thumbs Down: weight -0.5
    """
    profile = [0.0] * FEATURE_DIM
    total_weight = 0.0
    
    # Process Favorites (+1.0 weight)
    for fav in favorites:
        genres_data = fav.get("genres", {})
        item_vec = encode_item_vector({
            "genres": genres_data.get("genres") if isinstance(genres_data, dict) else [],
            "media_type": genres_data.get("media_type", "movie") if isinstance(genres_data, dict) else "movie",
            "release_date": fav.get("release_date"),
            "vote_average": genres_data.get("vote_average", 7.5) if isinstance(genres_data, dict) else 7.5
        })
        weight = 1.0
        for i in range(FEATURE_DIM):
            profile[i] += weight * item_vec[i]
        total_weight += weight
        
    # Process Feedback (+0.8 for thumbs_up, -0.5 for thumbs_down)
    for fb in feedback_list:
        ftype = fb.get("feedback_type")
        weight = 0.8 if ftype == "thumbs_up" else (-0.5 if ftype == "thumbs_down" else 0.0)
        if weight == 0.0:
            continue
            
        genres_data = fb.get("genres", {})
        item_vec = encode_item_vector({
            "genres": genres_data.get("genres") if isinstance(genres_data, dict) else [],
            "media_type": genres_data.get("media_type", "movie") if isinstance(genres_data, dict) else "movie",
            "release_date": fb.get("release_date"),
            "vote_average": genres_data.get("vote_average", 7.5) if isinstance(genres_data, dict) else 7.5
        })
        for i in range(FEATURE_DIM):
            profile[i] += weight * item_vec[i]
        total_weight += abs(weight)

    if total_weight == 0:
        # Default balanced vector if no history yet
        return [1.0 / math.sqrt(FEATURE_DIM)] * FEATURE_DIM
        
    return _normalize_vector(profile)


def rank_candidates_with_cosine_similarity(user_profile: list[float], candidates_metadata: list[dict]) -> list[dict]:
    """
    Ranks candidate items using Cosine Similarity against the user's preference vector.
    Appends 'cosine_similarity' and 'match_percentage' to each item dict.
    """
    scored_items = []
    for item in candidates_metadata:
        item_vec = encode_item_vector(item)
        sim_score = calculate_cosine_similarity(user_profile, item_vec)
        match_pct = round(min(99.9, max(68.0, sim_score * 100.0)), 1)
        
        item_copy = dict(item)
        item_copy["cosine_similarity"] = round(sim_score, 4)
        item_copy["match_percentage"] = match_pct
        scored_items.append((sim_score, item_copy))
        
    scored_items.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored_items]
