"""Clean targeted audit queries"""
import sqlite3

conn = sqlite3.connect("governance.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("=== PART A: news_articles SCHEMA ===")
c.execute("PRAGMA table_info(news_articles)")
cols = [(r["name"], r["type"]) for r in c.fetchall()]
for n, t in cols:
    print(f"  {n:40s} {t}")

print("\n=== PART B: KEY STATS ===")
c.execute("SELECT COUNT(*) FROM news_articles"); print(f"  Total rows: {c.fetchone()[0]}")
c.execute("SELECT MIN(scraped_at), MAX(scraped_at) FROM news_articles")
r = c.fetchone(); print(f"  Date range: {r[0]} — {r[1]}")

print("\n=== PART C: LOCATION COLUMNS CHECK ===")
col_names = [n for n, _ in cols]
loc_fields = ["state", "district", "city", "ward", "latitude", "longitude"]
for f in loc_fields:
    if f in col_names:
        c.execute(f"SELECT COUNT(*) FROM news_articles WHERE {f} IS NOT NULL AND CAST({f} AS TEXT) != ''")
        print(f"  {f}: {c.fetchone()[0]} non-null values [PRESENT]")
    else:
        print(f"  {f}: [COLUMN MISSING FROM SCHEMA]")

print("\n=== PART D: SOURCE DISTRIBUTION (top 20) ===")
c.execute("""SELECT COALESCE(source_name,'NULL') s, COUNT(*) n 
             FROM news_articles GROUP BY source_name ORDER BY n DESC LIMIT 20""")
for r in c.fetchall(): print(f"  {str(r['s'])[:45]:45s}: {r['n']}")

print("\n=== PART E: FAKE NEWS LABELS ===")
c.execute("SELECT COALESCE(fake_news_label,'NULL') l, COUNT(*) n FROM news_articles GROUP BY fake_news_label ORDER BY n DESC")
for r in c.fetchall(): print(f"  {str(r['l']):20s}: {r['n']}")

print("\n=== PART F: RISK LEVELS ===")
c.execute("SELECT COALESCE(risk_level,'NULL') l, COUNT(*) n, ROUND(AVG(risk_score),1) avg FROM news_articles GROUP BY risk_level ORDER BY n DESC")
for r in c.fetchall(): print(f"  {str(r['l']):15s}: {r['n']} rows | avg_score={r['avg']}")

print("\n=== PART G: FIRST 5 ROWS (full) ===")
c.execute("SELECT * FROM news_articles LIMIT 5")
rows = c.fetchall()
for row in rows:
    d = dict(zip(col_names, row))
    print(f"\n  ID: {d.get('id')}")
    print(f"  Title: {str(d.get('title',''))[:80]}")
    print(f"  Source: {d.get('source_name')}")
    print(f"  Source_type: {d.get('source_type')}")
    # Check all location-ish fields
    for f in ["state","district","city","ward","latitude","longitude","location"]:
        if f in d: print(f"  {f}: {d[f]}")
    print(f"  risk_score: {d.get('risk_score')} | risk_level: {d.get('risk_level')}")
    print(f"  fake_news_label: {d.get('fake_news_label')} | scraped_at: {d.get('scraped_at')}")

print("\n=== PART H: ALL UNIQUE COLUMN NAMES IN news_articles ===")
print(f"  {col_names}")

conn.close()
print("\n=== DONE ===")
