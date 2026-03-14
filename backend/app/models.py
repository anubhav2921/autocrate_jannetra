import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from .database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(200), nullable=False)
    source_type = Column(
        Enum("SOCIAL_MEDIA", "NEWS", "COMPLAINT", name="source_type_enum"),
        nullable=False,
    )
    domain = Column(String(255))
    credibility_tier = Column(
        Enum("VERIFIED", "UNKNOWN", "FLAGGED", name="credibility_enum"),
        default="UNKNOWN",
    )
    historical_accuracy = Column(Float, default=0.5)
    last_audited_at = Column(DateTime, default=datetime.utcnow)

    articles = relationship("Article", back_populates="source")


class Article(Base):
    __tablename__ = "articles"

    id = Column(String, primary_key=True, default=gen_uuid)
    source_id = Column(String, ForeignKey("sources.id"), nullable=False)
    title = Column(String(500), nullable=False)
    raw_text = Column(Text, nullable=False)
    language = Column(String(10), default="en")
    content_hash = Column(String(64), unique=True)
    location = Column(String(200))
    category = Column(String(100))
    ingested_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="articles")
    detection_result = relationship("DetectionResult", back_populates="article", uselist=False)
    gri_score = relationship("GovernanceRiskScore", back_populates="article", uselist=False)
    sentiment = relationship("SentimentRecord", back_populates="article", uselist=False)
    alerts = relationship("Alert", back_populates="article")


class DetectionResult(Base):
    __tablename__ = "detection_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    article_id = Column(String, ForeignKey("articles.id"), nullable=False)
    confidence_score = Column(Float, default=0.0)
    label = Column(
        Enum("REAL", "FAKE", "UNCERTAIN", name="detection_label_enum"),
        default="UNCERTAIN",
    )
    features_json = Column(JSON, default=dict)
    evaluated_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("Article", back_populates="detection_result")


class GovernanceRiskScore(Base):
    __tablename__ = "governance_risk_scores"

    id = Column(String, primary_key=True, default=gen_uuid)
    article_id = Column(String, ForeignKey("articles.id"), nullable=False)
    gri_score = Column(Float, default=0.0)
    component_scores = Column(JSON, default=dict)
    risk_level = Column(
        Enum("LOW", "MODERATE", "HIGH", name="risk_level_enum"),
        default="LOW",
    )
    computed_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("Article", back_populates="gri_score")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=gen_uuid)
    article_id = Column(String, ForeignKey("articles.id"), nullable=False)
    severity = Column(
        Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="severity_enum"),
        default="MEDIUM",
    )
    department = Column(String(200))
    recommendation = Column(Text)
    urgency = Column(String(50))
    response_strategy = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("Article", back_populates="alerts")


class SentimentRecord(Base):
    __tablename__ = "sentiment_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    article_id = Column(String, ForeignKey("articles.id"), nullable=False)
    polarity = Column(Float, default=0.0)
    subjectivity = Column(Float, default=0.0)
    anger_rating = Column(Float, default=0.0)
    sentiment_label = Column(
        Enum("POSITIVE", "NEUTRAL", "NEGATIVE", name="sentiment_label_enum"),
        default="NEUTRAL",
    )
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("Article", back_populates="sentiment")


class User(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True, default=gen_uuid)
    name          = Column(String(200), nullable=False)
    email         = Column(String(255), unique=True, nullable=True)   # nullable for phone-only accounts
    password_hash = Column(String(255), nullable=True)                # nullable for Google / phone accounts
    role          = Column(
        Enum("LEADER", "ADMIN", "ANALYST", name="user_role_enum"),
        default="LEADER",
    )
    department    = Column(String(200))
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    # Firebase / OAuth fields
    google_uid    = Column(String(255), unique=True, nullable=True)   # Legacy, kept for backward compatibility
    firebase_uid  = Column(String(255), unique=True, nullable=True, index=True)  # Canonical Firebase UID
    phone_number  = Column(String(20), unique=True, nullable=True, index=True)   # E.164 format
    picture       = Column(String(500), nullable=True)                # Profile photo URL
    auth_provider = Column(String(50), default="email")               # "email", "google", or "phone"


class Resolution(Base):
    __tablename__ = "resolutions"

    id = Column(String, primary_key=True, default=gen_uuid)
    alert_id = Column(String, ForeignKey("alerts.id"), nullable=True)
    resolved_by = Column(String, ForeignKey("users.id"), nullable=False)

    title = Column(String(500), nullable=False)
    category = Column(String(100))
    location = Column(String(200))

    problem_description = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=False)

    resources_used = Column(Text)
    people_benefited = Column(String(100))

    status = Column(
        Enum("RESOLVED", "IN_PROGRESS", "PARTIALLY_RESOLVED", name="resolution_status_enum"),
        default="RESOLVED",
    )

    created_at = Column(DateTime, default=datetime.utcnow)   # ← ADD THIS
    resolved_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, default=datetime.utcnow)

class SignalProblem(Base):
    __tablename__ = "signal_problems"

    id = Column(String, primary_key=True)  # e.g. "SIG-001"
    title = Column(String(500), nullable=False)
    severity = Column(String(50), nullable=False)  # Critical, High, Medium, Low
    category = Column(String(200), nullable=False)
    location = Column(String(300))
    detected_at = Column(String(50))
    description = Column(Text)
    risk_score = Column(Float, default=0.0)
    source = Column(String(300))
    status = Column(String(50), default="Pending")  # "Pending" or "Problem Resolved"


class SystemMetric(Base):
    __tablename__ = "system_metrics"

    id = Column(String, primary_key=True)  # e.g. "SYS-001"
    subsystem_name = Column(String(300), nullable=False)
    metric_type = Column(String(100), nullable=False)  # CPU, Memory, Latency, etc.
    status = Column(String(50), default="Healthy")  # Healthy, Warning, Critical, Degraded
    current_value = Column(Float, default=0.0)
    threshold_value = Column(Float, default=0.0)
    unit = Column(String(30), default="%")
    location = Column(String(300))
    ai_diagnosis = Column(Text, default="")
    ai_recommendation = Column(Text, default="")
    last_checked_at = Column(String(50))
    trend = Column(String(50), default="Stable")  # Improving, Stable, Degrading


class CommunityReview(Base):
    __tablename__ = "community_reviews"

    id = Column(String, primary_key=True, default=gen_uuid)
    article_id = Column(String, ForeignKey("articles.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)  # Nullable for anonymous
    review_text = Column(Text, nullable=False)
    verdict = Column(String(50), default="unconfirmed")  # real, false, needs_more_info
    created_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("Article")
    user    = relationship("User")


class NewsArticle(Base):
    """
    Real-world scraped articles — separate from seeded demo data.
    Populated by the automated data pipeline (scrapers → NLP → DB).
    """
    __tablename__ = "news_articles"

    id               = Column(String, primary_key=True, default=gen_uuid)
    title            = Column(String(500), nullable=False)
    content          = Column(Text, nullable=False)
    source_name      = Column(String(300), nullable=False)
    source_url       = Column(String(500), default="")
    url              = Column(String(500), default="")
    published_at     = Column(DateTime, nullable=True)
    content_hash     = Column(String(64), unique=True, nullable=False)  # SHA-256 for dedup

    # NLP analysis results
    credibility_score = Column(Float, default=0.5)
    risk_score        = Column(Float, default=0.0)      # GRI score 0–100
    risk_level        = Column(String(20), default="LOW")  # LOW / MODERATE / HIGH
    sentiment_label   = Column(String(20), default="NEUTRAL")
    sentiment_polarity = Column(Float, default=0.0)
    anger_rating      = Column(Float, default=0.0)
    fake_news_label   = Column(String(20), default="UNCERTAIN")  # REAL / FAKE / UNCERTAIN
    fake_news_confidence = Column(Float, default=0.0)

    # Priority / frequency tracking
    occurrence_count  = Column(Integer, default=1)
    priority_score    = Column(Float, default=1.0)
    priority_level    = Column(String(20), default="LOW")  # LOW / MEDIUM / HIGH / CRITICAL
    last_seen         = Column(DateTime, default=datetime.utcnow)

    # Metadata
    category         = Column(String(100), default="General")
    source_type      = Column(String(50), default="NEWS")
    tier             = Column(String(20), default="UNKNOWN")
    scraped_at       = Column(DateTime, default=datetime.utcnow)
    created_at       = Column(DateTime, default=datetime.utcnow)

    # Geographic location (hierarchical)
    state            = Column(String(100), nullable=True, index=True)
    district         = Column(String(100), nullable=True, index=True)
    city             = Column(String(100), nullable=True, index=True)
    ward             = Column(String(150), nullable=True)
    latitude         = Column(Float, nullable=True)
    longitude        = Column(Float, nullable=True)
