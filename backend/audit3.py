"""Audit part 2 - write to JSON file"""
import sqlite3, json

conn = sqlite3.connect("governance.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

result = {}

# Schema
c.execute("PRAGMA table_info(news_articles)")
cols = [(r["name"], r["type"]) for r in c.fetchall()]
result["schema"] = cols
col_names = [n for n, _ in cols]
result["col_names"] = col_names

# Stats
c.execute("SELECT COUNT(*) FROM news_articles"); result["total"] = c.fetchone()[0]
c.execute("SELECT MIN(scraped_at), MAX(scraped_at) FROM news_articles")
r = c.fetchone(); result["earliest"] = str(r[0]); result["latest"] = str(r[1])

# Location columns
loc_fields = ["state","district","city","ward","latitude","longitude","location"]
result["location_coverage"] = {}
for f in loc_fields:
    if f in col_names:
        c.execute(f"SELECT COUNT(*) FROM news_articles WHERE {f} IS NOT NULL AND CAST({f} AS TEXT) != ''")
        result["location_coverage"][f] = {"present": True, "count": c.fetchone()[0]}
    else:
        result["location_coverage"][f] = {"present": False, "count": 0}

# Sources
c.execute("SELECT COALESCE(source_name,'NULL') s, COUNT(*) n FROM news_articles GROUP BY source_name ORDER BY n DESC LIMIT 25")
result["sources"] = [{"name": str(r["s"]), "count": r["n"]} for r in c.fetchall()]

# Labels
c.execute("SELECT COALESCE(fake_news_label,'NULL') l, COUNT(*) n FROM news_articles GROUP BY fake_news_label ORDER BY n DESC")
result["labels"] = [{"label": str(r["l"]), "count": r["n"]} for r in c.fetchall()]

# Risk levels
c.execute("SELECT COALESCE(risk_level,'NULL') l, COUNT(*) n, ROUND(AVG(risk_score),1) avg FROM news_articles GROUP BY risk_level ORDER BY n DESC")
result["risk_levels"] = [{"level": str(r["l"]), "count": r["n"], "avg": r["avg"]} for r in c.fetchall()]

# Sample rows
c.execute("SELECT * FROM news_articles ORDER BY risk_score DESC LIMIT 5")
samples = []
for row in c.fetchall():
    d = {col_names[i]: str(row[i]) if row[i] is not None else None for i in range(len(col_names))}
    samples.append(d)
result["top_5_by_risk"] = samples

# Check if mock data source appears
c.execute("SELECT COUNT(*) FROM news_articles WHERE source_name LIKE '%Times of India%' OR source_name LIKE '%NDTV%' OR source_name LIKE '%Hindu%'")
result["verified_news_count"] = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM news_articles WHERE source_name LIKE '%Reddit%'")
result["reddit_count"] = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM news_articles WHERE source_name LIKE '%WhatsApp%' OR source_name LIKE '%mock%' OR source_name LIKE '%seed%'")
result["mock_count"] = c.fetchone()[0]

# Location cross-filter test (using any location columns if they exist)
loc_col_present = [f for f in ["state","district","city"] if f in col_names]
result["loc_col_present"] = loc_col_present

# Category distribution
c.execute("SELECT COALESCE(category,'NULL') cat, COUNT(*) n FROM news_articles GROUP BY category ORDER BY n DESC LIMIT 15")
result["categories"] = [{"cat": str(r["cat"]), "count": r["n"]} for r in c.fetchall()]

conn.close()

with open("audit_output.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, default=str)

print("Written to audit_output.json")
