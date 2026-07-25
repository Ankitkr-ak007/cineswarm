import pytest
from app.core.tmdb import extract_watch_providers

def test_extract_watch_providers_india():
    mock_metadata = {
        "watch/providers": {
            "results": {
                "IN": {
                    "flatrate": [
                        {"provider_name": "JioCinema", "logo_path": "/jiocinema.jpg"},
                        {"provider_name": "Netflix", "logo_path": "/netflix.jpg"}
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
    assert len(providers) == 2
    assert providers[0]["name"] == "JioCinema"
    assert "jiocinema.com" in providers[0]["link"]
    assert providers[1]["name"] == "Netflix"
    assert "netflix.com" in providers[1]["link"]

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
