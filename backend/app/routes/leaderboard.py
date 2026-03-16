from fastapi import APIRouter
from ..mongodb import users_collection, resolutions_collection

router = APIRouter(prefix="/api", tags=["Leaderboard"])


@router.get("/leaderboard")
async def get_leaderboard():
    """Rank leaders by number of resolutions."""
    all_users = await users_collection.find({}).to_list(None)

    leaders = []
    for user in all_users:
        uid = user["id"]
        total = await resolutions_collection.count_documents({"resolved_by": uid})
        resolved = await resolutions_collection.count_documents({"resolved_by": uid, "status": "RESOLVED"})
        in_progress = total - resolved
        score = resolved * 100 + in_progress * 40
        leaders.append({
            "id": uid,
            "name": user.get("name"),
            "department": user.get("department"),
            "role": user.get("role"),
            "total_resolutions": total,
            "resolved": resolved,
            "in_progress": in_progress,
            "score": score,
        })

    leaders.sort(key=lambda x: x["score"], reverse=True)
    badges = ["🥇", "🥈", "🥉"]
    for i, l in enumerate(leaders):
        l["rank"] = i + 1
        l["badge"] = badges[i] if i < 3 else "🏅"

    return {"leaderboard": leaders}
