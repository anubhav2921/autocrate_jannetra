from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, Resolution

router = APIRouter(prefix="/api", tags=["Leaderboard"])


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    """Rank leaders by number of resolutions."""
    results = (
        db.query(
            User.id,
            User.name,
            User.department,
            User.role,
            func.count(Resolution.id).label("total"),
            func.count(
                func.nullif(Resolution.status != "RESOLVED", True)
            ).label("resolved"),
        )
        .outerjoin(Resolution, Resolution.resolved_by == User.id)
        .group_by(User.id)
        .order_by(func.count(Resolution.id).desc())
        .all()
    )

    leaders = []
    for rank, r in enumerate(results, 1):
        score = (r.resolved or 0) * 100 + ((r.total or 0) - (r.resolved or 0)) * 40
        leaders.append({
            "rank": rank,
            "id": r.id,
            "name": r.name,
            "department": r.department,
            "role": r.role,
            "total_resolutions": r.total or 0,
            "resolved": r.resolved or 0,
            "in_progress": (r.total or 0) - (r.resolved or 0),
            "score": score,
            "badge": "🥇" if rank == 1 else "🥈" if rank == 2 else "🥉" if rank == 3 else "🏅",
        })

    return {"leaderboard": leaders}
