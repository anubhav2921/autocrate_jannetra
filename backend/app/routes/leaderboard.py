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
        
        # Count manual resolutions
        man_total = await resolutions_collection.count_documents({"resolved_by": uid})
        man_resolved = await resolutions_collection.count_documents({"resolved_by": uid, "status": "RESOLVED"})
        
        # Count signal resolutions
        from ..mongodb import signal_problems_collection
        sig_total = await signal_problems_collection.count_documents({"resolved_by": uid})
        sig_resolved = await signal_problems_collection.count_documents({"resolved_by": uid, "status": "Problem Resolved"})
        
        total = man_total + sig_total
        resolved = man_resolved + sig_resolved
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
