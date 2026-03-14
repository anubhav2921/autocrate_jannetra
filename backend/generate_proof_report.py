import sqlite3
import json

conn = sqlite3.connect("governance.db")
c = conn.cursor()

def run(query):
    c.execute(query)
    return c.fetchall()

result = {}

result["schema"] = run("PRAGMA table_info(news_articles);")

result["total_records"] = run("SELECT COUNT(*) FROM news_articles;")[0][0]
result["valid_metadata"] = run("SELECT COUNT(*) FROM news_articles WHERE state IS NOT NULL AND district IS NOT NULL AND city IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;")[0][0]
result["missing_metadata"] = run("SELECT COUNT(*) FROM news_articles WHERE city IS NULL OR latitude IS NULL;")[0][0]

result["city_dist"] = run("SELECT city, COUNT(*) FROM news_articles GROUP BY city ORDER BY COUNT(*) DESC;")

result["invalid_coords"] = run("SELECT COUNT(*) FROM news_articles WHERE latitude IS NOT NULL AND (latitude NOT BETWEEN -90 AND 90 OR longitude NOT BETWEEN -180 AND 180);")[0][0]
result["prayagraj_coords"] = run("SELECT title, city, latitude, longitude FROM news_articles WHERE city='Prayagraj' LIMIT 10;")

result["prayagraj_count"] = run("SELECT COUNT(*) FROM news_articles WHERE city='Prayagraj';")[0][0]
result["lucknow_count"] = run("SELECT COUNT(*) FROM news_articles WHERE city='Lucknow';")[0][0]
result["overlap_count"] = run("SELECT COUNT(*) FROM news_articles WHERE city='Prayagraj' AND city='Lucknow';")[0][0]

result["sources"] = run("SELECT source_name, COUNT(*) FROM news_articles GROUP BY source_name;")

with open("proof.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)

print("Saved proof.json")
