import sqlite3
import json

conn = sqlite3.connect("governance.db")
c = conn.cursor()

def run(query):
    c.execute(query)
    return c.fetchall()

result = {}

result["total_records"] = run("SELECT COUNT(*) FROM news_articles;")[0][0]
city_dist = run("SELECT city, COUNT(*) FROM news_articles GROUP BY city ORDER BY COUNT(*) DESC;")

result["detected_cities"] = len([c for c in city_dist if c[0] is not None])
result["records_per_city"] = {c[0] if c[0] is not None else "India": c[1] for c in city_dist}

result["prayagraj_count"] = run("SELECT COUNT(*) FROM news_articles WHERE city='Prayagraj';")[0][0]
result["lucknow_count"] = run("SELECT COUNT(*) FROM news_articles WHERE city='Lucknow';")[0][0]

from app.database import SessionLocal
from app.models import NewsArticle
from sqlalchemy import func

db = SessionLocal()
def _get(city, count_only=False):
    q = db.query(NewsArticle).filter(func.lower(NewsArticle.city) == func.lower(city))
    return q.count() if count_only else q.all()

result["sqlalchemy_filter_prayagraj"] = _get("Prayagraj", True)
result["sqlalchemy_filter_lucknow"] = _get("lucknow", True)
result["sqlalchemy_filter_kanpur"] = _get("KANPUR", True)
db.close()

with open("repair_verification.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)

print("Saved repair_verification.json")
