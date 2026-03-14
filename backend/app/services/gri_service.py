"""
Governance Risk Index (GRI) Service

GRI = Σ(wᵢ × dᵢ) × 100

Dimensions:
  d1: Source Credibility Score       (w = 0.30)
  d2: Linguistic Manipulation Index  (w = 0.25)
  d3: Cross-Reference Consistency    (w = 0.20)
  d4: Temporal Anomaly Score         (w = 0.15)
  d5: Network Amplification Risk     (w = 0.10)

Risk Levels:
  0–30  → LOW      (green)
  31–60 → MODERATE (amber)   → human review queue
  61–100 → HIGH    (red)     → auto-flag + escalate
"""

import random
from datetime import datetime

WEIGHTS = {
    "source_credibility": 0.30,
    "linguistic_manipulation": 0.25,
    "cross_reference": 0.20,
    "temporal_anomaly": 0.15,
    "network_amplification": 0.10,
}


def _compute_cross_reference(claims: list, label: str) -> float:
    """
    Cross-reference consistency score (0–1).
    In production: checks claims against knowledge graph.
    Here: heuristic based on claim count and detection label.
    """
    claim_count = len(claims)
    if claim_count == 0:
        return 0.3  # No claims = moderate risk (can't verify)

    # More unverifiable claims = higher inconsistency
    base = min(claim_count / 8.0, 1.0)

    if label == "FAKE":
        return min(base + 0.3, 1.0)
    elif label == "REAL":
        return max(base - 0.2, 0.0)
    return base


def _compute_temporal_anomaly(ingested_at: datetime) -> float:
    """
    Temporal anomaly: unusual timing patterns.
    In production: detects coordinated posting bursts.
    Here: adds variance based on hour-of-day (late-night = higher anomaly).
    """
    hour = ingested_at.hour
    # Late-night posts (11 PM – 5 AM) are more anomalous
    if 23 <= hour or hour <= 5:
        return round(random.uniform(0.5, 0.8), 3)
    elif 6 <= hour <= 9 or 18 <= hour <= 22:
        return round(random.uniform(0.2, 0.5), 3)
    else:
        return round(random.uniform(0.05, 0.3), 3)


def _compute_network_amplification(source_type: str, word_count: int) -> float:
    """
    Network amplification risk.
    Social media posts with short, viral-style content score higher.
    """
    base = {"SOCIAL_MEDIA": 0.6, "NEWS": 0.25, "COMPLAINT": 0.15}.get(
        source_type, 0.3
    )
    # Short posts are more likely viral/amplified
    if word_count < 50:
        base += 0.2
    elif word_count > 200:
        base -= 0.1

    return round(min(max(base, 0.0), 1.0), 3)


def compute_gri(
    source_credibility: float,
    linguistic_manipulation_index: float,
    claims: list,
    detection_label: str,
    ingested_at: datetime,
    source_type: str,
    word_count: int,
) -> dict:
    """
    Compute the Governance Risk Index.
    Returns gri_score (0–100), risk_level, and per-dimension breakdown.
    """
    # d1: Source credibility (invert: low credibility = high risk)
    d1 = 1.0 - min(max(source_credibility, 0.0), 1.0)

    # d2: Linguistic manipulation index (already 0–1)
    d2 = min(max(linguistic_manipulation_index, 0.0), 1.0)

    # d3: Cross-reference inconsistency
    d3 = _compute_cross_reference(claims, detection_label)

    # d4: Temporal anomaly
    d4 = _compute_temporal_anomaly(ingested_at)

    # d5: Network amplification
    d5 = _compute_network_amplification(source_type, word_count)

    # Weighted sum × 100
    gri_score = (
        WEIGHTS["source_credibility"] * d1
        + WEIGHTS["linguistic_manipulation"] * d2
        + WEIGHTS["cross_reference"] * d3
        + WEIGHTS["temporal_anomaly"] * d4
        + WEIGHTS["network_amplification"] * d5
    ) * 100

    gri_score = round(min(max(gri_score, 0.0), 100.0), 2)

    # Risk level thresholds
    if gri_score <= 30:
        risk_level = "LOW"
    elif gri_score <= 60:
        risk_level = "MODERATE"
    else:
        risk_level = "HIGH"

    return {
        "gri_score": gri_score,
        "risk_level": risk_level,
        "component_scores": {
            "source_credibility_risk": round(d1, 4),
            "linguistic_manipulation": round(d2, 4),
            "cross_reference_inconsistency": round(d3, 4),
            "temporal_anomaly": round(d4, 4),
            "network_amplification": round(d5, 4),
        },
    }
