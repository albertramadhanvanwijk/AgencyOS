from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ReleaseFeatureItem(BaseModel):
    key: str
    title: str
    type: str
    estimate_points: float
    qa_status: Optional[str] = None
    sprint_name: Optional[str] = None
    pull_request_url: Optional[str] = None
    git_branch: Optional[str] = None

class ReleaseNotesOut(BaseModel):
    project_id: str
    project_name: str
    project_key: str
    version_tag: str
    generated_at: str
    total_features_delivered: int
    total_points_delivered: float
    qa_certification_rate: float
    features: List[ReleaseFeatureItem]
    retrospective_highlights: Dict[str, List[str]]
    markdown: str

class PublishReleaseIn(BaseModel):
    version_tag: Optional[str] = "v1.0.0"
    commit_to_repo: Optional[bool] = True
