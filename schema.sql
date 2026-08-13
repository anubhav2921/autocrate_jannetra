-- schema.sql
-- Run this in your Supabase SQL Editor to create the required tables for JanNetra

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'LEADER',
    department TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    auth_provider TEXT DEFAULT 'email',
    google_uid TEXT,
    phone_number TEXT,
    picture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sources Table
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    domain TEXT,
    credibility_tier TEXT DEFAULT 'UNKNOWN',
    historical_accuracy FLOAT DEFAULT 0.5,
    last_audited_at TIMESTAMP WITH TIME ZONE
);

-- 3. Articles Table (Legacy seeded demo data)
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES sources(id),
    title TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    content_hash TEXT NOT NULL,
    location TEXT,
    category TEXT,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. News Articles Table (For the live scraping pipeline)
CREATE TABLE news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_name TEXT,
    source_url TEXT,
    url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    content_hash TEXT UNIQUE NOT NULL,
    
    credibility_score FLOAT DEFAULT 0.5,
    risk_score FLOAT DEFAULT 0.0,
    risk_level TEXT DEFAULT 'LOW',
    sentiment_label TEXT DEFAULT 'NEUTRAL',
    sentiment_polarity FLOAT DEFAULT 0.0,
    anger_rating FLOAT DEFAULT 0.0,
    fake_news_label TEXT DEFAULT 'UNCERTAIN',
    fake_news_confidence FLOAT DEFAULT 0.0,
    
    category TEXT DEFAULT 'General',
    source_type TEXT DEFAULT 'NEWS',
    tier TEXT DEFAULT 'UNKNOWN',
    
    city TEXT,
    district TEXT,
    state TEXT,
    
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Detection Results
CREATE TABLE detection_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID,
    confidence_score FLOAT DEFAULT 0.0,
    label TEXT DEFAULT 'UNCERTAIN',
    features_json JSONB DEFAULT '{}'::jsonb,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Governance Risk Scores
CREATE TABLE governance_risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID,
    gri_score FLOAT DEFAULT 0.0,
    component_scores JSONB DEFAULT '{}'::jsonb,
    risk_level TEXT DEFAULT 'LOW',
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Sentiment Records
CREATE TABLE sentiment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID,
    polarity FLOAT DEFAULT 0.0,
    subjectivity FLOAT DEFAULT 0.0,
    anger_rating FLOAT DEFAULT 0.0,
    sentiment_label TEXT DEFAULT 'NEUTRAL',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Signal Problems (Aggregated problem clusters and citizen reports)
CREATE TABLE signal_problems (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    severity TEXT DEFAULT 'Medium',
    category TEXT DEFAULT 'General',
    department TEXT,
    state TEXT,
    district TEXT,
    city TEXT,
    ward TEXT,
    location TEXT,
    location_detail TEXT,
    description TEXT,
    report_description TEXT,
    evidence_summary TEXT,
    expected_solution TEXT,
    image_url TEXT,
    audio_url TEXT,
    risk_score FLOAT DEFAULT 0.0,
    priority_score FLOAT DEFAULT 0.0,
    frequency INTEGER DEFAULT 1,
    source TEXT,
    source_url TEXT,
    source_type TEXT,
    status TEXT DEFAULT 'Pending',
    progress INTEGER DEFAULT 0,
    has_ai_summary BOOLEAN DEFAULT FALSE,
    sample_records JSONB DEFAULT '[]'::jsonb,
    resolution_proof_url TEXT,
    resolution_report TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    deletion_reason TEXT,
    assigned_to TEXT,
    assigned_name TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE,
    anger_avg FLOAT DEFAULT 0.0,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID REFERENCES news_articles(id),
    severity TEXT DEFAULT 'MEDIUM',
    department TEXT,
    recommendation TEXT,
    urgency TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Resolutions
CREATE TABLE resolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES alerts(id),
    resolved_by TEXT,
    title TEXT NOT NULL,
    category TEXT,
    location TEXT,
    problem_description TEXT,
    action_taken TEXT,
    status TEXT DEFAULT 'RESOLVED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 11. System Metrics
CREATE TABLE system_metrics (
    id TEXT PRIMARY KEY,
    subsystem_name TEXT NOT NULL,
    metric_type TEXT,
    status TEXT DEFAULT 'Healthy',
    current_value FLOAT,
    threshold_value FLOAT,
    unit TEXT,
    ai_diagnosis TEXT,
    ai_recommendation TEXT,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    trend TEXT DEFAULT 'Stable'
);

-- 12. Community Reviews
CREATE TABLE community_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID,
    user_id UUID REFERENCES users(id),
    review_text TEXT NOT NULL,
    verdict TEXT DEFAULT 'unconfirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Activity Logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    problem_id TEXT,
    action TEXT NOT NULL,
    performed_by TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Scraper Config Table
CREATE TABLE scraper_config (
    id TEXT PRIMARY KEY,
    city TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Citizen Reports Table (Direct citizen grievance filings)
CREATE TABLE citizen_reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Citizen Report',
    department TEXT,
    user_description TEXT,
    ai_description TEXT,
    image_url TEXT,
    audio_url TEXT,
    latitude FLOAT,
    longitude FLOAT,
    location TEXT,
    city TEXT DEFAULT 'Prayagraj',
    district TEXT,
    state TEXT,
    ward TEXT,
    severity TEXT DEFAULT 'Medium',
    urgency TEXT DEFAULT 'Medium',
    confidence_score FLOAT DEFAULT 0.0,
    expected_solution TEXT,
    status TEXT DEFAULT 'Pending',
    progress INTEGER DEFAULT 0,
    resolution_report TEXT,
    resolution_proof_url TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast query and filtering
CREATE INDEX IF NOT EXISTS idx_signal_problems_category ON signal_problems(category);
CREATE INDEX IF NOT EXISTS idx_signal_problems_status ON signal_problems(status);
CREATE INDEX IF NOT EXISTS idx_signal_problems_created_at ON signal_problems(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_status ON citizen_reports(status);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_created_at ON citizen_reports(created_at DESC);

