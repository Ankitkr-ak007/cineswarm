from pydantic import BaseModel, Field

class EvaluateRequest(BaseModel):
    title: str = Field(..., description="The title of the movie to evaluate.")

class EvaluateResponse(BaseModel):
    score: float = Field(..., description="The score given by the critic (1-10).")
    reasoning: str = Field(..., description="2-3 sentences reasoning.")
    verdict: str = Field(..., description="A one-line verdict.")
