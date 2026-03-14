import sqlite3
conn = sqlite3.connect("governance.db")
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
print("=== TABLES ===")
for r in c.fetchall():
    print(r[0])
conn.close()
