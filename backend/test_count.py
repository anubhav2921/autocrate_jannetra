import sqlite3

conn=sqlite3.connect('governance.db')
c=conn.cursor()

c.execute("SELECT COUNT(*) FROM news_articles WHERE city='Prayagraj'")
print('Prayagraj records:', c.fetchall()[0][0])

c.execute("SELECT COUNT(*) FROM news_articles WHERE city='Lucknow'")
print('Lucknow records:', c.fetchall()[0][0])

c.execute("SELECT title, latitude, longitude FROM news_articles WHERE city='Prayagraj'")
print('Prayagraj coords example:', c.fetchall()[:2])

conn.close()
