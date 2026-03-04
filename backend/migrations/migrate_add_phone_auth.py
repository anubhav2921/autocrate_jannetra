"""
Database migration: Add phone_number and firebase_uid columns to users table.
Run this once before restarting the backend after the model update.

Usage:
    cd backend
    python migrate_add_phone_auth.py

Note: SQLite doesn't support ALTER TABLE ADD COLUMN ... UNIQUE.
      Uniqueness is enforced via CREATE UNIQUE INDEX instead.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "governance.db")


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"[MIGRATE] Database not found at {DB_PATH}. It will be created on first startup.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get existing columns
    cursor.execute("PRAGMA table_info(users)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    changes_made = False

    # Add firebase_uid column
    if "firebase_uid" not in existing_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255)")
        print("[MIGRATE] Added column: firebase_uid")
        changes_made = True
    else:
        print("[MIGRATE] Column firebase_uid already exists — skipping.")

    # Add phone_number column
    if "phone_number" not in existing_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)")
        print("[MIGRATE] Added column: phone_number")
        changes_made = True
    else:
        print("[MIGRATE] Column phone_number already exists — skipping.")

    # Create unique indexes (idempotent — IF NOT EXISTS)
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_firebase_uid ON users(firebase_uid)"
    )
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone_number ON users(phone_number)"
    )
    print("[MIGRATE] Ensured unique indexes on firebase_uid and phone_number.")

    if changes_made:
        conn.commit()
        print("[MIGRATE] Migration complete!")
    else:
        conn.commit()  # commit indexes
        print("[MIGRATE] No column changes needed. Indexes verified.")

    conn.close()


if __name__ == "__main__":
    migrate()
