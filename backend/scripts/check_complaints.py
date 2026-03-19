import sqlite3
import json

def get_complaints():
    conn = sqlite3.connect('governance.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM complaints LIMIT 10")
    rows = cursor.fetchall()
    
    # Get column names
    column_names = [description[0] for description in cursor.description]
    
    complaints = []
    for row in rows:
        complaints.append(dict(zip(column_names, row)))
        
    conn.close()
    return complaints

if __name__ == "__main__":
    print(json.dumps(get_complaints(), indent=2))
