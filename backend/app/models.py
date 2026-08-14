"""
Pydantic Schemas — JanNetra Backend

Replaces the former SQLAlchemy ORM models.
MongoDB is schema-less; these schemas are used for request/response validation only.
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ─────────────────────────────────────────────
#  Source
# ─────────────────────────────────────────────
class SourceSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    name: str
    source_type: str  # SOCIAL_MEDIA | NEWS | COMPLAINT
    domain: Optional[str] = None
    credibility_tier: str = "UNKNOWN"  # VERIFIED | UNKNOWN | FLAGGED
    historical_accuracy: float = 0.5
    last_audited_at: Optional[datetime] = None


# ─────────────────────────────────────────────
#  Article  (legacy seeded demo data)
# ─────────────────────────────────────────────
class ArticleSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    source_id: str
    title: str
    raw_text: str
    language: str = "en"
    content_hash: str
    location: Optional[str] = None
    category: Optional[str] = None
    ingested_at: Optional[datetime] = None


# ─────────────────────────────────────────────
#  DetectionResult
# ─────────────────────────────────────────────
class DetectionResultSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    article_id: str
    confidence_score: float = 0.0
    label: str = "UNCERTAIN"  # REAL | FAKE | UNCERTAIN
    features_json: Dict[str, Any] = {}
    evaluated_at: Optional[datetime] = None


# ─────────────────────────────────────────────
#  GovernanceRiskScore
# ─────────────────────────────────────────────
class GovernanceRiskScoreSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    article_id: str
    gri_score: float = 0.0
    component_scores: Dict[str, Any] = {}
    risk_level: str = "LOW"  # LOW | MODERATE | HIGH
    computed_at: Optional[datetime] = None


# ─────────────────────────────────────────────
#  Alert
# ─────────────────────────────────────────────
class AlertSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    article_id: str
    severity: str = "MEDIUM"  # LOW | MEDIUM | HIGH | CRITICAL
    department: Optional[str] = None
    recommendation: Optional[str] = None
    urgency: Optional[str] = None
    response_strategy: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None


# ─────────────────────────────────────────────
#  SentimentRecord
# ─────────────────────────────────────────────
class SentimentRecordSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    article_id: str
    polarity: float = 0.0
    subjectivity: float = 0.0
    anger_rating: float = 0.0
    sentiment_label: str = "NEUTRAL"  # POSITIVE | NEUTRAL | NEGATIVE
    analyzed_at: Optional[datetime] = None


# ─────────────────────────────────────────────
#  User
# ─────────────────────────────────────────────
class UserSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    name: str
    email: Optional[str] = None
    password_hash: Optional[str] = None
    role: str = "LEADER"  # LEADER | ADMIN | ANALYST | CITIZEN | LOCAL_LEADER | PANCHAYAT_OFFICER | MUNICIPAL_OFFICER | DEPARTMENT_OFFICER | BLOCK_OFFICER | DISTRICT_OFFICER | STATE_OFFICER
    department: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    google_uid: Optional[str] = None
    firebase_uid: Optional[str] = None
    phone_number: Optional[str] = None
    picture: Optional[str] = None
    auth_provider: str = "email"  # email | google | phone | firebase
    username: Optional[str] = None
    phone: Optional[str] = None
    organization_id: Optional[str] = None
    jurisdiction_id: Optional[str] = None


# ─────────────────────────────────────────────
#  Resolution
# ─────────────────────────────────────────────
class ResolutionSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    alert_id: Optional[str] = None
    resolved_by: str
    title: str
    category: Optional[str] = None
    location: Optional[str] = None
    problem_description: str
    action_taken: str
    resources_used: Optional[str] = None
    people_benefited: Optional[str] = None
    status: str = "RESOLVED"  # RESOLVED | IN_PROGRESS | PARTIALLY_RESOLVED
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None


# ─────────────────────────────────────────────
#  SignalProblem
# ─────────────────────────────────────────────
class SignalProblemSchema(BaseModel):
    id: str  # e.g. "SIG-001"
    title: str
    severity: str  # Critical | High | Medium | Low
    category: str
    location: Optional[str] = None
    detected_at: Optional[str] = None
    description: Optional[str] = None
    risk_score: float = 0.0
    source: Optional[str] = None
    source_url: Optional[str] = None
    source_type: Optional[str] = None
    created_at: Optional[datetime] = None
    status: str = "Pending"  # Pending | Problem Resolved


# ─────────────────────────────────────────────
#  SystemMetric
# ─────────────────────────────────────────────
class SystemMetricSchema(BaseModel):
    id: str  # e.g. "SYS-001"
    subsystem_name: str
    metric_type: str  # CPU | Memory | Latency | etc.
    status: str = "Healthy"  # Healthy | Warning | Critical | Degraded
    current_value: float = 0.0
    threshold_value: float = 0.0
    unit: str = "%"
    location: Optional[str] = None
    ai_diagnosis: str = ""
    ai_recommendation: str = ""
    last_checked_at: Optional[str] = None
    trend: str = "Stable"  # Improving | Stable | Degrading


# ─────────────────────────────────────────────
#  CommunityReview
# ─────────────────────────────────────────────
class CommunityReviewSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    article_id: str
    user_id: Optional[str] = None
    review_text: str
    verdict: str = "unconfirmed"  # real | false | needs_more_info
    created_at: Optional[datetime] = None


# ─────────────────────────────────────────────
#  NewsArticle  (live scraping pipeline data)
# ─────────────────────────────────────────────
class NewsArticleSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    title: str
    content: str
    source_name: str
    source_url: str = ""
    url: str = ""
    published_at: Optional[datetime] = None
    content_hash: str

    # NLP analysis
    credibility_score: float = 0.5
    risk_score: float = 0.0
    risk_level: str = "LOW"
    sentiment_label: str = "NEUTRAL"
    sentiment_polarity: float = 0.0
    anger_rating: float = 0.0
    fake_news_label: str = "UNCERTAIN"
    fake_news_confidence: float = 0.0

    # Priority / frequency
    occurrence_count: int = 1
    priority_score: float = 1.0
    priority_level: str = "LOW"
    last_seen: Optional[datetime] = None

    # Metadata
    category: str = "General"
    source_type: str = "NEWS"
    tier: str = "UNKNOWN"
    scraped_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    # Geographic
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    ward: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ─────────────────────────────────────────────
#  Jurisdiction
# ─────────────────────────────────────────────
class JurisdictionSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    name: str
    level: str  # STATE | DISTRICT | BLOCK | MUNICIPALITY | PANCHAYAT | WARD | VILLAGE
    parent_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────
#  Organization
# ─────────────────────────────────────────────
class OrganizationSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    name: str
    parent_id: Optional[str] = None
    jurisdiction_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────
#  GovernanceProblemLocation
# ─────────────────────────────────────────────
class GovernanceProblemLocation(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    village: Optional[str] = None
    ward: Optional[str] = None
    panchayat: Optional[str] = None
    block: Optional[str] = None
    municipality: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None


# ─────────────────────────────────────────────
#  GovernanceProblem
# ─────────────────────────────────────────────
class GovernanceProblemSchema(BaseModel):
    problem_id: str = Field(default_factory=gen_uuid)
    source_signal_id: Optional[str] = None
    source_citizen_report_id: Optional[str] = None
    title: str
    description: str
    category: str
    subcategory: Optional[str] = None
    priority: str = "MEDIUM"  # LOW | MEDIUM | HIGH | CRITICAL
    severity: str = "MEDIUM"  # LOW | MEDIUM | HIGH | CRITICAL
    status: str = "DETECTED"  # DETECTED | PENDING_VERIFICATION | VERIFIED | ROUTED | ASSIGNED | ACCEPTED | IN_PROGRESS | RESOLUTION_SUBMITTED | UNDER_VERIFICATION | RESOLVED | REJECTED | ESCALATED | REASSIGNED | CANCELLED
    location: GovernanceProblemLocation
    department_id: Optional[str] = None
    organization_id: Optional[str] = None
    jurisdiction_id: Optional[str] = None
    created_by: Optional[str] = None
    verified_by: Optional[str] = None
    current_owner_user_id: Optional[str] = None
    current_owner_organization_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    resolution_summary: Optional[str] = None


# ─────────────────────────────────────────────
#  ProblemAssignment
# ─────────────────────────────────────────────
class ProblemAssignmentSchema(BaseModel):
    assignment_id: str = Field(default_factory=gen_uuid)
    problem_id: str
    assigned_by: str
    assigned_to_user_id: Optional[str] = None
    assigned_to_organization_id: Optional[str] = None
    assigned_to_jurisdiction_id: Optional[str] = None
    assignment_type: str  # USER | ORGANIZATION | DEPARTMENT | JURISDICTION
    reason: Optional[str] = None
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    status: str = "PENDING"  # PENDING | ACCEPTED | REJECTED


# ─────────────────────────────────────────────
#  ProblemHistory
# ─────────────────────────────────────────────
class ProblemHistorySchema(BaseModel):
    history_id: str = Field(default_factory=gen_uuid)
    problem_id: str
    actor_id: str
    actor_role: str
    action: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    previous_owner: Optional[str] = None
    new_owner: Optional[str] = None
    remarks: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}


# ─────────────────────────────────────────────
#  Escalation
# ─────────────────────────────────────────────
class EscalationSchema(BaseModel):
    escalation_id: str = Field(default_factory=gen_uuid)
    problem_id: str
    escalated_by: str  # SYSTEM or user_id
    escalated_from_user_id: Optional[str] = None
    escalated_to_user_id: Optional[str] = None
    escalated_to_organization_id: Optional[str] = None
    level: int = 1
    reason: str
    escalated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    status: str = "PENDING"  # PENDING | RESOLVED


# ─────────────────────────────────────────────
#  InternalNotification
# ─────────────────────────────────────────────
class InternalNotificationSchema(BaseModel):
    id: str = Field(default_factory=gen_uuid)
    user_id: str
    title: str
    message: str
    problem_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────
#  SlaConfig
# ─────────────────────────────────────────────
class SlaConfigSchema(BaseModel):
    priority: str  # LOW | MEDIUM | HIGH | CRITICAL
    duration_hours: int


# ─────────────────────────────────────────────
#  RoutingRule
# ─────────────────────────────────────────────
class RoutingRuleSchema(BaseModel):
    category: str
    subcategory: Optional[str] = None
    department_id: str
    default_organization_id: Optional[str] = None
