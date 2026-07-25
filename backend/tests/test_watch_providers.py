import pytest
from app.core.tmdb import extract_watch_providers, _build_provider_link

def test_extract_watch_providers_india():
    mock_metadata = {
        "title": "3 Idiots",
        "watch/providers": {
            "results": {
                "IN": {
                    "flatrate": [
                        {"provider_name": "JioCinema", "logo_path": "/jiocinema.jpg"},
                        {"provider_name": "Netflix", "logo_path": "/netflix.jpg"}
                    ],
                    "rent": [
                        {"provider_name": "YouTube", "logo_path": "/youtube.jpg"}
                    ]
                },
                "US": {
                    "flatrate": [
                        {"provider_name": "Hulu", "logo_path": "/hulu.jpg"}
                    ]
                }
            }
        }
    }
    
    providers = extract_watch_providers(mock_metadata)
    assert len(providers) == 3
    assert providers[0]["name"] == "JioCinema"
    assert "jiocinema.com" in providers[0]["link"]
    assert providers[1]["name"] == "Netflix"
    assert "netflix.com" in providers[1]["link"]
    assert providers[2]["name"] == "YouTube"
    assert "youtube.com/results?search_query=watch+3+Idiots+full+movie+official" in providers[2]["link"]

def test_extract_watch_providers_fallback_custom_region():
    mock_metadata = {
        "watch/providers": {
            "results": {
                "US": {
                    "flatrate": [
                        {"provider_name": "Hulu", "logo_path": "/hulu.jpg"}
                    ]
                }
            }
        }
    }
    
    # Default IN should return empty list if IN is not present
    in_providers = extract_watch_providers(mock_metadata)
    assert in_providers == []

    # Explicit US region should return Hulu
    us_providers = extract_watch_providers(mock_metadata, region="US")
    assert len(us_providers) == 1
    assert us_providers[0]["name"] == "Hulu"

def test_youtube_official_link_builder():
    link = _build_provider_link("YouTube", "3 Idiots", None)
    assert "youtube.com/results?search_query=watch+3+Idiots+full+movie+official" in link
