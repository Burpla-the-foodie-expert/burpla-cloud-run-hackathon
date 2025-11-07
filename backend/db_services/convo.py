import sqlite3
from config import DATABASE_PATH
from datetime import datetime

class ConvoManager:
    """Manage ."""

    def __init__(self, db_path="burbla.db"):
        self.db_path = db_path
        self.table_name = "convo"
        self._initialize_db()

    def _initialize_db(self):
        """Creates the necessary table if it doesn't exist."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {self.table_name}(
                    session_id TEXT PRIMARY KEY,
                    session_name TEXT,
                    owner_id TEXT,
                    member_id_list TEXT,
                    last_updated datetime DEFAULT CURRENT_TIMESTAMP,
                    created_date datetime DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Check if table is empty and add 1 convo if it is
            cursor.execute(f"SELECT COUNT(*) FROM {self.table_name}")
            count = cursor.fetchone()[0]
            if count == 0:
                cursor.execute(f"""
                    INSERT INTO {self.table_name} (session_id, session_name, owner_id, member_id_list, created_date, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, ("session_001", "Burbla team", "user_001", "user_001,user_002,user_003", "2025-01-15 10:30:00", "2025-11-03 15:45:00"))

                cursor.execute(f"""
                    INSERT INTO {self.table_name} (session_id, session_name, owner_id, member_id_list, created_date, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, ("session_002", "LOL Squad", "user_002", "user_002,user_003", "2025-02-10 08:00:00", "2025-11-05 18:20:00"))

                cursor.execute(f"""
                    INSERT INTO {self.table_name} (session_id, session_name, owner_id, member_id_list, created_date, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, ("session_003", "Demo", "user_003", "user_001,user_002,user_003", "2025-01-05 10:30:00", "2025-11-04 15:45:00"))

                conn.commit()

    def add_convo(self, session_id, session_name, owner_id, member_id_list):
        """Adds a new  to the database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Use INSERT OR IGNORE to avoid errors if session already exists
            cursor.execute(f"""
                INSERT OR IGNORE INTO {self.table_name} (session_id, session_name, owner_id, member_id_list)
                VALUES (?, ?, ?, ?)
            """, (session_id, session_name, owner_id, member_id_list))
            conn.commit()

    def update_member_list(self, session_id, member_id_list):
        """Updates the member_id_list for an existing session."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                UPDATE {self.table_name}
                SET member_id_list = ?, last_updated = ?
                WHERE session_id = ?
            """, (member_id_list, datetime.now().isoformat(), session_id))
            conn.commit()

    def get_convo(self, session_id):
        """Retrieves a conversation from the database by session_id."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT session_id, session_name, owner_id, member_id_list, last_updated, created_date
                FROM {self.table_name}
                WHERE session_id = ?
            """, (session_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "session_id": row[0],
                    "session_name": row[1],
                    "owner_id": row[2],
                    "member_id_list": row[3],
                    "last_updated": row[4],
                    "created_date": row[5]
                }
            return None

    def delete_convo(self, session_id):
        """Deletes a  from the database by session_id."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                DELETE FROM {self.table_name}
                WHERE session_id = ?
            """, (session_id,))

    def update_last_updated(self, session_id):
        """Updates the last_updated timestamp of a conversation."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                UPDATE {self.table_name}
                SET last_updated = ?
                WHERE session_id = ?
            """, (datetime.now().isoformat(), session_id))
            conn.commit()

    def list_convos_for_user(self, user_id):
        """Lists all convos where the user belongs to member_id_list, ordered by last_updated DESC."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT * FROM {self.table_name}
                WHERE member_id_list LIKE ?
                ORDER BY last_updated DESC
            """, (f"%{user_id}%",))
            rows = cursor.fetchall()
            convos = []
            for row in rows:
                convos.append({
                    "session_id": row[0],
                    "session_name": row[1],
                    "owner_id": row[2],
                    "member_id_list": row[3],
                    "last_updated": row[4],
                    "created_date": row[5]
                })
            return convos
