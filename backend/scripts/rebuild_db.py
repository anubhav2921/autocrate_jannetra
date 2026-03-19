from app.database import Base, engine
from app.models import *
import sqlite3

def rebuild_and_verify():
    Base.metadata.create_all(bind=engine)
    conn = sqlite3.connect("governance.db")
    c = conn.cursor()
    c.execute("PRAGMA table_info(news_articles)")
    cols = [row[1] for row in c.fetchall()]
    print("Rebuilt news_articles columns:", cols)
    conn.close()

if __name__ == '__main__':
    rebuild_and_verify()
