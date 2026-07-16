from app.agents.consensus import calculate_consensus_score
from app.core.safety import is_safe_for_kids

def test_calculate_consensus_score():
    # Equal weights, all agents succeed
    scores = {"critic": 8.0, "vibes": 9.0, "hidden_gems": 7.0, "data": 8.0}
    weights = {"critic": 0.25, "vibes": 0.25, "hidden_gems": 0.25, "data": 0.25}
    assert calculate_consensus_score(scores, weights) == 8.0
    
    # Missing agents (e.g. Vibes failed)
    scores = {"critic": 8.0, "vibes": None, "hidden_gems": 7.0, "data": 9.0}
    # Weighted calculation should ignore 'vibes' entirely and divide by 0.75
    # (8*0.25 + 7*0.25 + 9*0.25) / 0.75 = 8.0
    assert calculate_consensus_score(scores, weights) == 8.0
    
    # All agents failed
    scores = {"critic": None, "vibes": None, "hidden_gems": None, "data": None}
    assert calculate_consensus_score(scores, weights) == 0.0
    
def test_kids_mode_safety():
    # Safe movie (G rating, no horror, no bad keywords)
    safe_metadata = {
        "title": "Toy Story",
        "overview": "A cowboy doll is profoundly threatened and jealous when a new spaceman figure supplants him as top toy in a boy's room.",
        "certification": "G",
        "adult": False,
        "genres": [{"name": "Animation"}, {"name": "Comedy"}, {"name": "Family"}],
        "genre_ids": [16, 35, 10751]
    }
    assert is_safe_for_kids(safe_metadata) == True
    
    # Unsafe due to adult flag
    adult_metadata = safe_metadata.copy()
    adult_metadata["adult"] = True
    assert is_safe_for_kids(adult_metadata) == False
    
    # Unsafe due to R certification
    r_rated_metadata = safe_metadata.copy()
    r_rated_metadata["certification"] = "R"
    assert is_safe_for_kids(r_rated_metadata) == False
    
    # Unsafe due to Horror genre
    horror_metadata = safe_metadata.copy()
    horror_metadata["genres"] = [{"name": "Horror"}]
    assert is_safe_for_kids(horror_metadata) == False
    
    # Unsafe due to keyword blocklist
    keyword_metadata = safe_metadata.copy()
    keyword_metadata["overview"] = "A murder mystery in the woods."
    assert is_safe_for_kids(keyword_metadata) == False
    
    # Fail-safe check: missing certification
    no_cert_metadata = safe_metadata.copy()
    no_cert_metadata.pop("certification")
    assert is_safe_for_kids(no_cert_metadata) == False
