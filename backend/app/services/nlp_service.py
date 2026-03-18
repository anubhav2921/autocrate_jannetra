import re
import logging

logger = logging.getLogger("jannetra.nlp")

# --- Optional GPU Acceleration ---
NLP_GPU_AVAILABLE = False
SENTIMENT_MODEL = None

try:
    import torch
    from transformers import pipeline
    
    device = 0 if torch.cuda.is_available() else -1
    if device == 0:
        logger.info("[NLP] GPU detected! Loading sentiment transformer on CUDA...")
        # Use a small, efficient model suitable for 4GB VRAM (distilbert)
        SENTIMENT_MODEL = pipeline(
            "sentiment-analysis", 
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=device
        )
        NLP_GPU_AVAILABLE = True
    else:
        logger.info("[NLP] No GPU found or CUDA not available. Using Pure-Python NLP.")
except ImportError:
    logger.info("[NLP] Transformers/Torch not installed. Using Pure-Python NLP.")
except Exception as e:
    logger.warning(f"[NLP] Failed to initialize GPU sentiment: {e}")

# Sentiment word lists
POSITIVE_WORDS = {
    "success", "successful", "improved", "improvement", "excellent", "good",
    "great", "progress", "positive", "benefit", "achievement", "completed",
    "inaugurated", "restored", "safe", "reduced", "effective", "recognized",
    "innovative", "remarkable", "beautiful", "proud", "celebration", "welcome",
    "appreciation", "upgrade", "upgraded", "launched", "partnership", "trust",
}

NEGATIVE_WORDS = {
    "fail", "failed", "failure", "crisis", "corrupt", "corruption", "death",
    "deaths", "kill", "killed", "collapse", "collapsed", "shortage", "protest",
    "angry", "anger", "outrage", "furious", "unsafe", "dangerous", "threat",
    "negligence", "incompetent", "pathetic", "shameful", "disgrace", "scandal",
    "suffering", "harassment", "broken", "delayed", "waste", "worst", "terrible",
    "horrible", "shocking", "unacceptable", "condemned", "violated", "damaged",
    "contaminated", "injured", "strike", "complaint", "overcrowded", "stench",
}

# Anger keywords with intensity weights
ANGER_KEYWORDS = {
    "furious": 1.0, "outrage": 1.0, "unacceptable": 0.9, "disgrace": 0.9,
    "corrupt": 0.85, "scandal": 0.85, "angry": 0.8, "rage": 0.8,
    "protest": 0.75, "demand": 0.7, "condemn": 0.7, "shocking": 0.7,
    "terrible": 0.65, "horrible": 0.65, "failure": 0.6, "negligence": 0.6,
    "incompetent": 0.6, "suffering": 0.55, "crisis": 0.55, "dying": 0.5,
    "pathetic": 0.5, "shameful": 0.5, "injustice": 0.45, "harassment": 0.45,
    "threat": 0.4, "unsafe": 0.4, "broken": 0.35, "complaint": 0.3,
    "problem": 0.25, "issue": 0.2, "concern": 0.15,
}

LOCATIONS = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
    "Pune", "Jaipur", "Lucknow", "Ahmedabad", "Patna", "Bhopal",
    "Chandigarh", "Ranchi", "Raipur", "Shimla", "Dehradun", "Guwahati",
    "Thiruvananthapuram", "Bhubaneswar", "Gandhinagar", "Srinagar",
    "Varanasi", "Agra", "Kanpur", "Nagpur", "Indore", "Coimbatore",
    "Visakhapatnam", "Surat", "Noida", "Gurgaon", "Thane", "Nashik",
]

DEPARTMENTS = [
    "Water Supply Department", "Public Works Department", "Health Department",
    "Education Department", "Police Department", "Municipal Corporation",
    "Transport Department", "Electricity Board", "Forest Department",
    "Revenue Department", "Urban Development", "Rural Development",
    "Social Welfare", "Women & Child Development", "Anti-Corruption Bureau",
]


def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment: use GPU transformer if available, else Pure-Python."""
    # Try GPU Transformer first
    if NLP_GPU_AVAILABLE and SENTIMENT_MODEL and len(text.strip()) > 10:
        try:
            # Truncate to max transformer length (512 tokens)
            result = SENTIMENT_MODEL(text[:1024])[0]
            label = result['label'].upper() # 'POSITIVE' or 'NEGATIVE'
            score = result['score']
            
            # Map score to polarity (-1 to 1)
            polarity = round(score if label == 'POSITIVE' else -score, 4)
            return {
                "polarity": polarity, 
                "subjectivity": 0.8, # Transformers are subjective by nature 
                "sentiment_label": label,
                "engine": "gpu_transformer"
            }
        except Exception as e:
            logger.debug(f"GPU Sentiment failed, falling back: {e}")

    # Fallback: Pure-Python
    words = set(re.findall(r'\b[a-z]+\b', text.lower()))
    pos = len(words & POSITIVE_WORDS)
    neg = len(words & NEGATIVE_WORDS)
    total = pos + neg or 1

    polarity = round((pos - neg) / total, 4)
    # Subjectivity: ratio of opinion words to total words
    all_words = text.lower().split()
    subjectivity = round(min((pos + neg) / max(len(all_words), 1) * 5, 1.0), 4)

    if polarity > 0.1:
        label = "POSITIVE"
    elif polarity < -0.1:
        label = "NEGATIVE"
    else:
        label = "NEUTRAL"

    return {
        "polarity": polarity, 
        "subjectivity": subjectivity, 
        "sentiment_label": label,
        "engine": "pure_python"
    }


def compute_anger_rating(text: str) -> float:
    """Anger rating 0.0–10.0 based on keyword density and intensity."""
    text_lower = text.lower()
    words = text_lower.split()
    total_words = max(len(words), 1)

    anger_score = 0.0
    matched_count = 0
    for keyword, weight in ANGER_KEYWORDS.items():
        count = text_lower.count(keyword)
        if count > 0:
            anger_score += count * weight
            matched_count += count

    density = matched_count / total_words
    raw = min(anger_score * density * 50, 10.0)
    return round(raw, 2)


def extract_entities(text: str) -> dict:
    """Extract locations and department mentions."""
    found_locations = [loc for loc in LOCATIONS if loc.lower() in text.lower()]
    found_departments = [
        dept for dept in DEPARTMENTS
        if all(w in text.lower() for w in dept.lower().split())
    ]
    return {"locations": found_locations, "departments": found_departments}


def extract_claims(text: str) -> list:
    """Split into sentences and find assertive claims."""
    sentences = re.split(r'[.!?]+', text)
    claim_patterns = [
        r'\b(is|are|was|were|has|have|will|should|must)\b',
        r'\b(according to|reports? (say|show|indicate))\b',
        r'\b(caused|resulted|led to|due to)\b',
        r'\b(\d+%|\d+ (people|deaths|cases|crores|lakhs))\b',
    ]
    claims = []
    for sent in sentences:
        sent = sent.strip()
        if len(sent) < 15:
            continue
        for pattern in claim_patterns:
            if re.search(pattern, sent, re.IGNORECASE):
                claims.append(sent)
                break
    return claims[:10]


def run_nlp_pipeline(text: str) -> dict:
    """Full NLP pipeline: sentiment → anger → entities → claims."""
    sentiment = analyze_sentiment(text)
    anger = compute_anger_rating(text)
    entities = extract_entities(text)
    claims = extract_claims(text)

    return {
        **sentiment,
        "anger_rating": anger,
        "entities": entities,
        "claims": claims,
        "word_count": len(text.split()),
    }
