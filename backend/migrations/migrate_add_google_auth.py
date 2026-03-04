"""
One-time migration script to add Google Auth columns to the existing users table.
Run this from the /backend directory:

    python migrate_add_google_auth.py

This is safe to run multiple times — it checks if columns already exist first.

SQLite limitation: UNIQUE constraints can't be added via ALTER TABLE.
We add the column without UNIQUE, and SQLAlchemy will enforce uniqueness
via the model definition when creating new tables.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "governance.db")


def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def migrate():
    if not os.path.exists(DB_PATH):
        print("[MIGRATE] governance.db not found — skipping (tables will be created fresh on next server start).")
        return

    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    added = []

    # Note: SQLite does not support ADD COLUMN ... UNIQUE via ALTER TABLE.
    # The application logic in auth.py enforces uniqueness of google_uid anyway.
    if not column_exists(cursor, "users", "google_uid"):
        cursor.execute("ALTER TABLE users ADD COLUMN google_uid TEXT")
        added.append("google_uid")

    if not column_exists(cursor, "users", "picture"):
        cursor.execute("ALTER TABLE users ADD COLUMN picture TEXT")
        added.append("picture")

    if not column_exists(cursor, "users", "auth_provider"):
        cursor.execute("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'")
        added.append("auth_provider")

    conn.commit()
    conn.close()

    if added:
        print(f"[MIGRATE] Successfully added columns to 'users': {', '.join(added)}")
    else:
        print("[MIGRATE] All columns already exist — nothing to do.")


if __name__ == "__main__":
    migrate()
