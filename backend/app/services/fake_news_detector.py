"""
Fake News Detection — 3-stage pipeline:
  Stage 1: Signal Extraction (linguistic patterns)
  Stage 2: Evidence Grounding (source credibility)
  Stage 3: Ensemble Decision (weighted combination → label + confidence)
"""

import re
import math

# Stage 1: Linguistic signal patterns

CLICKBAIT_PATTERNS = [
    r"you won'?t believe",
    r"shocking",
    r"breaking\s*:",
    r"exposed\s*!",
    r"secret(s)?\s+(revealed|exposed)",
    r"this will (blow|change|shock)",
    r"\b(exposed|busted|caught)\b.*!",
    r"what they don'?t want you to know",
    r"exposed!?\s*$",
    r"must (read|see|watch)",
]

HEDGING_WORDS = [
    "allegedly", "reportedly", "sources say", "unconfirmed",
    "it is believed", "some say", "might be", "could be",
    "rumor", "rumour", "speculation", "unverified",
    "anonymous source", "insider claims",
]

EMOTIONAL_AMPLIFIERS = [
    "!!!", "??!", "EXPOSED", "SHOCKING", "OUTRAGEOUS", "DISGUSTING",
    "WAKE UP", "SHARE THIS", "VIRAL", "SPREAD THE WORD",
    "THEY DON'T WANT YOU TO KNOW", "COVERUP", "CONSPIRACY",
]


def _signal_extraction(text: str) -> dict:
    """Stage 1: Extract linguistic signals for manipulation detection."""
    text_lower = text.lower()
    words = text_lower.split()
    total_words = max(len(words), 1)

    # Clickbait score
    clickbait_hits = sum(
        1 for p in CLICKBAIT_PATTERNS if re.search(p, text_lower)
    )
    clickbait_score = min(clickbait_hits / 3.0, 1.0)

    # Hedging language ratio
    hedge_hits = sum(1 for h in HEDGING_WORDS if h in text_lower)
    hedge_ratio = min(hedge_hits / 5.0, 1.0)

    # Emotional amplification
    amp_hits = sum(1 for a in EMOTIONAL_AMPLIFIERS if a.lower() in text_lower)
    # Also count excessive punctuation
    exclaim_count = text.count("!") + text.count("?")
    amp_score = min((amp_hits + exclaim_count / 10) / 4.0, 1.0)

    # ALL CAPS ratio (manipulation signal)
    caps_words = sum(1 for w in text.split() if w.isupper() and len(w) > 2)
    caps_ratio = min(caps_words / max(total_words, 1), 1.0)

    # Named source check (lack of attribution)
    has_named_source = bool(
        re.search(r'(said|stated|according to|confirmed by)\s+[A-Z]', text)
    )
    source_absence = 0.0 if has_named_source else 0.6

    # Passive voice density (obfuscation signal)
    passive_hits = len(re.findall(
        r'\b(was|were|been|being|is|are)\s+\w+ed\b', text_lower
    ))
    passive_density = min(passive_hits / max(total_words / 10, 1), 1.0)

    # Composite linguistic manipulation index
    lmi = (
        clickbait_score * 0.25
        + hedge_ratio * 0.20
        + amp_score * 0.20
        + caps_ratio * 0.10
        + source_absence * 0.15
        + passive_density * 0.10
    )

    return {
        "clickbait_score": round(clickbait_score, 3),
        "hedge_ratio": round(hedge_ratio, 3),
        "amplification_score": round(amp_score, 3),
        "caps_ratio": round(caps_ratio, 3),
        "source_absence": round(source_absence, 3),
        "passive_density": round(passive_density, 3),
        "linguistic_manipulation_index": round(lmi, 4),
    }


# Stage 2: Evidence Grounding

def _evidence_grounding(source_credibility: float, source_tier: str) -> dict:
    """
    Stage 2: Evaluate source reliability.
    source_credibility: 0.0–1.0 (historical accuracy)
    source_tier: VERIFIED / UNKNOWN / FLAGGED
    """
    tier_score = {"VERIFIED": 0.9, "UNKNOWN": 0.5, "FLAGGED": 0.15}.get(
        source_tier, 0.5
    )

    # Combined source reliability score
    reliability = (source_credibility * 0.6) + (tier_score * 0.4)

    return {
        "source_reliability": round(reliability, 4),
        "tier_score": round(tier_score, 2),
        "credibility_score": round(source_credibility, 4),
    }


# Stage 3: Ensemble Decision

def _ensemble_decision(
    lmi: float,
    source_reliability: float,
    sentiment_extremity: float,
) -> dict:
    """
    Stage 3: Combine all signals into final label + confidence.
    Uses weighted soft voting.
    """
    # Invert source reliability: low reliability = high fake probability
    fake_probability = (
        lmi * 0.40
        + (1.0 - source_reliability) * 0.35
        + sentiment_extremity * 0.25
    )

    # Confidence is how certain we are (distance from 0.5)
    confidence = abs(fake_probability - 0.5) * 2.0
    confidence = min(max(confidence, 0.0), 1.0)

    # Decision thresholds
    if fake_probability >= 0.60:
        label = "FAKE"
    elif fake_probability <= 0.35:
        label = "REAL"
    else:
        label = "UNCERTAIN"

    # If confidence is too low, downgrade to UNCERTAIN
    if confidence < 0.3 and label != "UNCERTAIN":
        label = "UNCERTAIN"

    return {
        "label": label,
        "confidence_score": round(confidence, 4),
        "fake_probability": round(fake_probability, 4),
    }


# Public API

def detect_fake_news(
    text: str,
    source_credibility: float = 0.5,
    source_tier: str = "UNKNOWN",
    polarity: float = 0.0,
    subjectivity: float = 0.5,
) -> dict:
    """
    Run the full 3-stage fake news detection pipeline.
    Returns label, confidence, and all intermediate signal features.
    """
    # Stage 1
    signals = _signal_extraction(text)
    lmi = signals["linguistic_manipulation_index"]

    # Stage 2
    grounding = _evidence_grounding(source_credibility, source_tier)
    reliability = grounding["source_reliability"]

    # Sentiment extremity: how far from neutral in either direction
    sentiment_extremity = min(
        (abs(polarity) + subjectivity) / 2.0, 1.0
    )

    # Stage 3
    decision = _ensemble_decision(lmi, reliability, sentiment_extremity)

    return {
        **decision,
        "features": {
            **signals,
            **grounding,
            "sentiment_extremity": round(sentiment_extremity, 4),
        },
    }
