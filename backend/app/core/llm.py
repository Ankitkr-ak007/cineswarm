import json
import httpx
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)

class LLMError(Exception):
    """Raised when all LLM providers fail."""
    pass

async def call_groq_json(system_prompt: str, user_prompt: str, temperature: float = 0.5, timeout: float = 20.0) -> dict:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": temperature
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)

async def call_gemini_json(system_prompt: str, user_prompt: str, temperature: float = 0.5, timeout: float = 20.0) -> dict:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": temperature
        }
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(content)

async def generate_json_with_fallback(system_prompt: str, user_prompt: str, temperature: float = 0.5) -> dict:
    """
    Attempts to generate JSON output using Groq first (fast, generous limits),
    and falls back to Gemini if Groq fails, or vice versa.
    """
    # 1. Try Groq
    if settings.GROQ_API_KEY:
        try:
            return await call_groq_json(system_prompt, user_prompt, temperature=temperature, timeout=20.0)
        except Exception as e:
            logger.warning("Groq call failed, trying Gemini fallback", error=str(e))
            
    # 2. Try Gemini
    if settings.GEMINI_API_KEY:
        try:
            return await call_gemini_json(system_prompt, user_prompt, temperature=temperature, timeout=20.0)
        except Exception as e:
            logger.warning("Gemini call failed", error=str(e))
            
    raise LLMError("All LLM providers failed to generate JSON response")
