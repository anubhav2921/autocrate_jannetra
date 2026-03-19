"""Full DB Audit — Janneetra System (uses correct table names)"""
import sqlite3

DB_PATH = "governance.db"
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
c = conn.cursor()

sep = lambda t: print(f"\n{'='*60}\n{t}\n{'='*60}")

# 1. SCHEMA
sep("1. news_articles SCHEMA")
c.execute("PRAGMA table_info(news_articles)")
na_cols = [(r["name"], r["type"]) for r in c.fetchall()]
for name, typ in na_cols:
    print(f"  {name:35s} {typ}")

sep("1b. articles (legacy seed) SCHEMA")
c.execute("PRAGMA table_info(articles)")
art_cols = [(r["name"], r["type"]) for r in c.fetchall()]
for name, typ in art_cols:
    print(f"  {name:35s} {typ}")

# 2. ROW COUNTS
sep("2. ROW COUNTS (all tables)")
for tbl in ["news_articles","articles","governance_risk_scores","detection_results",
            "sentiment_records","alerts","signal_problems","sources"]:
    try:
        c.execute(f"SELECT COUNT(*) FROM {tbl}")
        print(f"  {tbl:35s}: {c.fetchone()[0]:>6}")
    except Exception as e:
        print(f"  {tbl:35s}: ERROR — {e}")

# 3. LOCATION COVERAGE
sep("3. LOCATION FIELD COVERAGE — news_articles")
c.execute("SELECT COUNT(*) FROM news_articles")
total_na = c.fetchone()[0]

# Check which location columns exist
loc_candidates = ["state","district","city","ward","latitude","longitude"]
existing_loc = [n for n, _ in na_cols if n in loc_candidates]
print(f"  Location columns present in schema: {existing_loc}")
print(f"  Total rows: {total_na}\n")

for field in existing_loc:
    c.execute(f"SELECT COUNT(*) FROM news_articles WHERE {field} IS NOT NULL AND CAST({field} AS TEXT) != ''")
    n = c.fetchone()[0]
    pct = round(n / max(total_na, 1) * 100, 1)
    print(f"  {field:15s}: {n:>5}/{total_na} ({pct:5.1f}%) have value")

# 4. STATE DISTRIBUTION
sep("4. STATE DISTRIBUTION — news_articles (top 20)")
if "state" in existing_loc:
    c.execute("SELECT COALESCE(state,'<NULL>') as s, COUNT(*) n FROM news_articles GROUP BY state ORDER BY n DESC LIMIT 20")
    for r in c.fetchall(): print(f"  {str(r['s']):30s}: {r['n']}")
else:
    print("  [NO 'state' COLUMN IN news_articles]")

# 5. CITY DISTRIBUTION
sep("5. CITY DISTRIBUTION — news_articles (top 20)")
if "city" in existing_loc:
    c.execute("SELECT COALESCE(city,'<NULL>') as ct, COUNT(*) n FROM news_articles GROUP BY city ORDER BY n DESC LIMIT 20")
    for r in c.fetchall(): print(f"  {str(r['ct']):30s}: {r['n']}")
else:
    print("  [NO 'city' COLUMN IN news_articles]")

# 6. SOURCE DISTRIBUTION
sep("6. SOURCE DISTRIBUTION — news_articles")
c.execute("SELECT COALESCE(source_name,'<NULL>') as s, COUNT(*) n FROM news_articles GROUP BY source_name ORDER BY n DESC LIMIT 25")
for r in c.fetchall(): print(f"  {str(r['s']):40s}: {r['n']}")

# 7. FAKE NEWS LABELS
sep("7. FAKE NEWS LABELS — news_articles")
c.execute("SELECT COALESCE(fake_news_label,'<NULL>') as l, COUNT(*) n FROM news_articles GROUP BY fake_news_label ORDER BY n DESC")
for r in c.fetchall(): print(f"  {str(r['l']):25s}: {r['n']}")

# 8. RISK LEVEL DISTRIBUTION
sep("8. RISK LEVEL — news_articles")
c.execute("SELECT COALESCE(risk_level,'<NULL>') as l, COUNT(*) n, ROUND(AVG(risk_score),1) avg FROM news_articles GROUP BY risk_level ORDER BY n DESC")
for r in c.fetchall(): print(f"  {str(r['l']):15s}: {r['n']} rows | avg_gri={r['avg']}")

# 9. PRAYAGRAJ DRILL-DOWN
sep("9. PRAYAGRAJ RECORDS DRILL-DOWN")
if "city" in existing_loc:
    c.execute("SELECT COUNT(*) FROM news_articles WHERE city='Prayagraj' OR district='Prayagraj'" if "district" in existing_loc else "SELECT COUNT(*) FROM news_articles WHERE city='Prayagraj'")
    pray_count = c.fetchone()[0]
    print(f"  Records matching Prayagraj city/district: {pray_count}")
    if pray_count > 0:
        q = "SELECT id, title, state, district, city, ward, latitude, longitude, source_name, risk_score, scraped_at FROM news_articles WHERE city='Prayagraj' OR district='Prayagraj' LIMIT 5"
        if "district" not in existing_loc:
            q = q.replace("OR district='Prayagraj'", "")
        c.execute(q)
        for r in c.fetchall():
            print(f"    [{r['id']}] {str(r['title'])[:70]}")
            print(f"         state={r['state']} | district={r['district'] if 'district' in existing_loc else 'N/A'} | city={r['city']} | lat={r['latitude']} | lng={r['longitude']}")
            print(f"         source={r['source_name']} | risk={r['risk_score']} | at={r['scraped_at']}")
else:
    print("  [NO 'city' COLUMN — cannot perform Prayagraj drill-down]")

# 10. PRAYAGRAJ BOUNDARY VALIDATION
sep("10. PRAYAGRAJ COORDINATE BOUNDARY VALIDATION")
if "city" in existing_loc and "latitude" in existing_loc:
    LAT_MIN, LAT_MAX = 25.0, 25.7
    LNG_MIN, LNG_MAX = 81.4, 82.3
    c.execute("SELECT COUNT(*) FROM news_articles WHERE (city='Prayagraj' OR district='Prayagraj') AND latitude IS NOT NULL" if "district" in existing_loc else "SELECT COUNT(*) FROM news_articles WHERE city='Prayagraj' AND latitude IS NOT NULL")
    pray_coords = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM news_articles WHERE (city='Prayagraj' OR district='Prayagraj') AND latitude IS NOT NULL AND (latitude<?OR latitude>?OR longitude<?OR longitude>?)" if "district" in existing_loc else "SELECT COUNT(*) FROM news_articles WHERE city='Prayagraj' AND latitude IS NOT NULL AND (latitude<?OR latitude>?OR longitude<?OR longitude>?)", (LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX))
    pray_outside = c.fetchone()[0]
    print(f"  Prayagraj records with coordinates: {pray_coords}")
    print(f"  Coords OUTSIDE Prayagraj bbox (lat {LAT_MIN}-{LAT_MAX} / lng {LNG_MIN}-{LNG_MAX}): {pray_outside}")
    print(f"  Coords INSIDE bbox (valid): {pray_coords - pray_outside}")
else:
    print("  [SKIP — city or latitude column missing]")

# 11. LUCKNOW DRILL-DOWN
sep("11. LUCKNOW RECORDS (cross-filter test data)")
if "city" in existing_loc:
    c.execute("SELECT COUNT(*) FROM news_articles WHERE city='Lucknow'")
    lck_count = c.fetchone()[0]
    print(f"  Records with city=Lucknow: {lck_count}")

# 12. SAMPLE FULLY-LOCATED RECORDS
sep("12. SAMPLE RECORDS (top 10 by risk, with location)")
if "city" in existing_loc and "state" in existing_loc:
    c.execute("""SELECT id,title,state,city,source_name,fake_news_label,risk_score,scraped_at
                 FROM news_articles WHERE state IS NOT NULL AND state!='' AND city IS NOT NULL AND city!=''
                 ORDER BY risk_score DESC LIMIT 10""")
    rows = c.fetchall()
    if not rows:
        print("  [No fully-located records found]")
    for r in rows:
        print(f"  [{r['id']}] {str(r['title'])[:70]}")
        print(f"       {r['state']} > {r['city']} | src={r['source_name']} | label={r['fake_news_label']} | score={r['risk_score']} | {r['scraped_at']}")
else:
    c.execute("SELECT id,title,source_name,fake_news_label,risk_score,scraped_at FROM news_articles ORDER BY risk_score DESC LIMIT 10")
    for r in c.fetchall():
        print(f"  [{r['id']}] {str(r['title'])[:70]}")
        print(f"       src={r['source_name']} | label={r['fake_news_label']} | score={r['risk_score']} | {r['scraped_at']}")

# 13. RECORDS WITH MISSING STATE
sep("13. MISSING LOCATION — news_articles")
if "state" in existing_loc:
    c.execute("SELECT COUNT(*) FROM news_articles WHERE state IS NULL OR state=''")
    miss_state = c.fetchone()[0]
    print(f"  Missing state: {miss_state}/{total_na} ({round(miss_state/max(total_na,1)*100,1)}%)")
    if miss_state > 0:
        c.execute("SELECT id,title,source_name,scraped_at FROM news_articles WHERE state IS NULL OR state='' ORDER BY scraped_at DESC LIMIT 5")
        for r in c.fetchall():
            print(f"    [{r['id']}] {str(r['title'])[:70]} | src={r['source_name']} | {r['scraped_at']}")
else:
    print("  [No 'state' column in news_articles]")

# 14. LEGACY articles TABLE
sep("14. LEGACY 'articles' TABLE (seed data)")
c.execute("SELECT COUNT(*) FROM articles")
seed_count = c.fetchone()[0]
print(f"  Total rows in 'articles' (seed): {seed_count}")
if seed_count > 0 and art_cols:
    col_names = [n for n, _ in art_cols]
    print(f"  Columns: {col_names}")
    c.execute("SELECT * FROM articles LIMIT 3")
    for r in c.fetchall():
        d = dict(zip(col_names, r))
        print(f"    [{d.get('id','')}] {str(d.get('title',''))[:70]}")
        for k in ['location','source','url','category']:
            if k in d: print(f"         {k}={d[k]}")

# 15. BACKEND FILTER LOGIC TEST
sep("15. BACKEND FILTER LOGIC SIMULATION")
print("  Testing: SELECT WHERE state='Uttar Pradesh' AND district='Prayagraj'")
if "state" in existing_loc and "district" in existing_loc:
    c.execute("SELECT COUNT(*) FROM news_articles WHERE state='Uttar Pradesh' AND district='Prayagraj'")
    n_up_pray = c.fetchone()[0]
    print(f"  Result count: {n_up_pray}")
    if n_up_pray > 0:
        c.execute("SELECT id,title,city,ward,risk_score FROM news_articles WHERE state='Uttar Pradesh' AND district='Prayagraj' LIMIT 5")
        for r in c.fetchall():
            print(f"    [{r['id']}] {str(r['title'])[:70]} | city={r['city']} | ward={r['ward']} | score={r['risk_score']}")
    
    print("\n  Testing: SELECT WHERE state='Uttar Pradesh' AND district='Lucknow' (cross-check)")
    c.execute("SELECT COUNT(*) FROM news_articles WHERE state='Uttar Pradesh' AND district='Lucknow'")
    n_up_lck = c.fetchone()[0]
    print(f"  Result count: {n_up_lck}")
    
    print("\n  Cross-contamination check: Do Prayagraj records appear in Lucknow query?")
    c.execute("SELECT COUNT(*) FROM news_articles WHERE district='Prayagraj' AND city='Lucknow'")
    cross = c.fetchone()[0]
    print(f"  district=Prayagraj AND city=Lucknow: {cross} records (should be 0)")
else:
    print("  [SKIP — state or district column missing]")

# 16. DATE RANGE
sep("16. DATA FRESHNESS")
c.execute("SELECT MIN(scraped_at), MAX(scraped_at), COUNT(*) FROM news_articles")
d = c.fetchone()
print(f"  Earliest record: {d[0]}")
print(f"  Latest record:   {d[1]}")
print(f"  Total records:   {d[2]}")

# 17. SUMMARY
sep("17. FINAL AUDIT SUMMARY")
c.execute("SELECT COUNT(*) FROM news_articles")
total = c.fetchone()[0]
located = 0
geo_coded = 0
real_cnt = 0
fake_cnt = 0
uncertain_cnt = 0

if "state" in existing_loc:
    c.execute("SELECT COUNT(*) FROM news_articles WHERE state IS NOT NULL AND state!=''")
    located = c.fetchone()[0]
if "latitude" in existing_loc:
    c.execute("SELECT COUNT(*) FROM news_articles WHERE latitude IS NOT NULL")
    geo_coded = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM news_articles WHERE fake_news_label='REAL'")
real_cnt = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM news_articles WHERE fake_news_label='FAKE'")
fake_cnt = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM news_articles WHERE fake_news_label NOT IN ('REAL','FAKE') OR fake_news_label IS NULL")
uncertain_cnt = c.fetchone()[0]
c.execute("SELECT COUNT(DISTINCT source_name) FROM news_articles WHERE source_name IS NOT NULL")
sources = c.fetchone()[0]

print(f"  Total news_articles         : {total}")
print(f"  With state assigned         : {located} ({round(located/max(total,1)*100,1)}%)")
print(f"  With GPS coordinates        : {geo_coded} ({round(geo_coded/max(total,1)*100,1)}%)")
print(f"  Labeled REAL                : {real_cnt} ({round(real_cnt/max(total,1)*100,1)}%)")
print(f"  Labeled FAKE                : {fake_cnt} ({round(fake_cnt/max(total,1)*100,1)}%)")
print(f"  Uncertain/unlabeled         : {uncertain_cnt} ({round(uncertain_cnt/max(total,1)*100,1)}%)")
print(f"  Distinct sources            : {sources}")
print(f"  Seed 'articles' rows        : {seed_count}")
print(f"  Location columns present    : {existing_loc}")

conn.close()
print("\n=== AUDIT COMPLETE ===")
