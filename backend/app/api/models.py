from pydantic import BaseModel, Field

class EvaluateRequest(BaseModel):
    title: str = Field(..., description="The title of the movie to evaluate.")

class EvaluateResponse(BaseModel):
    score: float = Field(..., description="The score given by the critic (1-10).")
    reasoning: str = Field(..., description="2-3 sentences reasoning.")
    verdict: str = Field(..., description="A one-line verdict.")

class RecommendRequest(BaseModel):
    mood: str = Field(..., description="The current mood of the user.")
    genres: list[str] = Field(default_factory=list, description="Preferred genres.")

class RecommendResponse(BaseModel):
    session_id: str = Field(..., description="A unique identifier for the recommendation session.")

class VerifyPinRequest(BaseModel):
    user_id: str = Field(..., description="The user's UUID.")
    pin: str = Field(..., description="The plaintext PIN to verify.")

class VerifyPinResponse(BaseModel):
    success: bool
    message: str

class FeedbackRequest(BaseModel):
    session_id: str = Field(..., description="The session ID.")
    feedback_type: str = Field(..., description="'thumbs_up' or 'thumbs_down'")
    comment: str | None = Field(default=None, description="Optional text feedback.")

class FeedbackResponse(BaseModel):
    success: bool

class TitleRecommendRequest(BaseModel):
    title: str = Field(..., description="The exact title of the movie to search for.")

class FavoriteRequest(BaseModel):
    movie_id: int
    watched: bool = False

class FavoriteResponse(BaseModel):
    success: bool

class MovieHistoryItem(BaseModel):
    tmdb_id: int
    title: str
    poster_path: str | None = None
    created_at: str
