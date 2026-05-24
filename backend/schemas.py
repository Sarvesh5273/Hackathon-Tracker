from typing import Optional, List
from pydantic import BaseModel, Field


class ExtractResponse(BaseModel):
    """Response from Gemini extraction"""
    name: str
    registration_open_at: Optional[str] = None
    registration_deadline: Optional[str] = None
    submission_open_at: Optional[str] = None
    submission_deadline: Optional[str] = None
    location: str
    mode: str
    description: str = ""


class ExtractRequest(BaseModel):
    """Request body for /api/extract"""
    url: str
    title: str
    page_text: Optional[str] = None


class HackathonCreate(BaseModel):
    """Request body for POST /api/hackathons"""
    name: str
    url: str
    registration_open_at: Optional[str] = None
    registration_deadline: Optional[str] = None
    submission_open_at: Optional[str] = None
    submission_deadline: Optional[str] = None
    location: str
    mode: str
    description: str = ""
    status: str = "interested"


class HackathonResponse(BaseModel):
    """Response for hackathon operations"""
    id: str
    user_id: str
    name: str
    url: str
    registration_open_at: Optional[str] = None
    registration_deadline: Optional[str] = None
    submission_open_at: Optional[str] = None
    submission_deadline: Optional[str] = None
    location: str
    mode: str
    description: str = ""
    status: str
    # optional embedded plan
    plan: Optional[PlanResponse] = None
    created_at: str
    updated_at: str


class PlanRequest(BaseModel):
    """Request body for PUT /api/hackathons/{id}/plan"""
    project_idea: str = ""
    tech_stack: List[str] = Field(default_factory=list)
    team_members: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    priority: Optional[str] = "medium"
    idea_done: bool = False
    implementation_done: bool = False
    demo_done: bool = False
    submitted: bool = False


class PlanResponse(BaseModel):
    """Response for plan operations"""
    id: str
    hackathon_id: str
    user_id: str
    project_idea: str = ""
    tech_stack: List[str] = Field(default_factory=list)
    team_members: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    priority: Optional[str] = None
    idea_done: bool = False
    implementation_done: bool = False
    demo_done: bool = False
    submitted: bool = False
    created_at: str
    updated_at: str


class ExtensionTokenResponse(BaseModel):
    """Response for POST /api/auth/extension-token"""
    token: str


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str