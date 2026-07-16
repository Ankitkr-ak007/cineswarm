from supabase import create_client, Client
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)

_supabase_client = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
            logger.error("Supabase URL or Secret Key is not configured.")
            raise RuntimeError("Supabase not configured")
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
    return _supabase_client
