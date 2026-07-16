from fastapi import APIRouter, HTTPException
import hashlib
import structlog
from app.api.models import VerifyPinRequest, VerifyPinResponse
from app.db.supabase import get_supabase_client

router = APIRouter()
logger = structlog.get_logger(__name__)

@router.post("/api/v1/kids-mode/verify-pin", response_model=VerifyPinResponse)
async def verify_kids_pin(request: VerifyPinRequest):
    log = logger.bind(user_id=request.user_id)
    log.info("Verifying Kids Mode PIN")
    
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    try:
        res = supabase.table("users").select("kids_pin_hash").eq("id", request.user_id).execute()
        data = res.data
        if not data:
            raise HTTPException(status_code=404, detail="User not found")
            
        stored_hash = data[0].get("kids_pin_hash")
        if not stored_hash:
            raise HTTPException(status_code=400, detail="User has no PIN set")
            
        # Very simple hash check. In prod, use bcrypt or argon2
        computed_hash = hashlib.sha256(request.pin.encode()).hexdigest()
        
        if computed_hash == stored_hash:
            log.info("PIN verified successfully")
            return VerifyPinResponse(success=True, message="PIN verified")
        else:
            log.warning("PIN verification failed")
            return VerifyPinResponse(success=False, message="Invalid PIN")
            
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Error verifying PIN")
        raise HTTPException(status_code=500, detail="Internal server error")
