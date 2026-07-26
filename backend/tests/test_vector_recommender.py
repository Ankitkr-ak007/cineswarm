import pytest
from app.core.vector_recommender import (
    encode_item_vector,
    calculate_cosine_similarity,
    build_user_profile_vector,
    rank_candidates_with_cosine_similarity,
    FEATURE_DIM
)

def test_encode_item_vector():
    meta = {
        "genres": [{"name": "Action"}, {"name": "Sci-Fi"}],
        "media_type": "movie",
        "release_date": "2021-10-22",
        "vote_average": 8.5
    }
    vec = encode_item_vector(meta)
    assert len(vec) == FEATURE_DIM
    # Vector magnitude must be approximately 1.0 (normalized)
    mag = sum(x * x for x in vec)
    assert abs(mag - 1.0) < 1e-4

def test_cosine_similarity_identical_vectors():
    vec_a = [1.0, 0.0, 0.0, 0.5]
    sim = calculate_cosine_similarity(vec_a, vec_a)
    assert abs(sim - 1.0) < 1e-4

def test_cosine_similarity_orthogonal_vectors():
    vec_a = [1.0, 0.0]
    vec_b = [0.0, 1.0]
    sim = calculate_cosine_similarity(vec_a, vec_b)
    assert sim == 0.0

def test_user_profile_vector_learning():
    favorites = [
        {"genres": {"genres": [{"name": "Action"}], "media_type": "movie"}, "release_date": "2020-01-01"}
    ]
    feedback = [
        {"feedback_type": "thumbs_up", "genres": {"genres": [{"name": "Sci-Fi"}], "media_type": "movie"}}
    ]
    user_profile = build_user_profile_vector(favorites, feedback)
    assert len(user_profile) == FEATURE_DIM
    
    # Candidates ranking
    candidates = [
        {"title": "Action Flick", "genres": [{"name": "Action"}], "media_type": "movie"},
        {"title": "Unrelated Documentary", "genres": [{"name": "Documentary"}], "media_type": "movie"}
    ]
    ranked = rank_candidates_with_cosine_similarity(user_profile, candidates)
    assert ranked[0]["title"] == "Action Flick"
    assert "cosine_similarity" in ranked[0]
    assert "match_percentage" in ranked[0]
