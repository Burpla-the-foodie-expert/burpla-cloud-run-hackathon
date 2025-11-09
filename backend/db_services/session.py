import sqlite3
from config import DATABASE_PATH
from datetime import datetime

class SessionManager:
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

            # Run migration to fix corrupted member_id_list entries on startup
            # This is safe to run multiple times as it only fixes corrupted entries
            conn.commit()  # Commit table creation before migration
            self._run_migration_if_needed()

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

    def add_session(self, session_id, session_name, owner_id, member_id_list):
        """Adds a new  to the database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Use INSERT OR IGNORE to avoid errors if session already exists
            cursor.execute(f"""
                INSERT OR IGNORE INTO {self.table_name} (session_id, session_name, owner_id, member_id_list)
                VALUES (?, ?, ?, ?)
            """, (session_id, session_name, owner_id, member_id_list))
            conn.commit()

    def _run_migration_if_needed(self):
        """Run migration to fix corrupted member_id_list entries if needed."""
        try:
            fixed_count = self.fix_corrupted_member_lists()
            if fixed_count > 0:
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Fixed {fixed_count} corrupted member_id_list entries on startup")
        except Exception as e:
            # Don't fail initialization if migration fails
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Migration check failed (non-critical): {e}")

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

    def get_owner_id(self, session_id):
        """Retrieves the owner_id of a session from the database by session_id."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT owner_id
                FROM {self.table_name}
                WHERE session_id = ?
            """, (session_id,))
            row = cursor.fetchone()
            if row:
                return row[0]
            return None
    #Change name and member list
    def update_session(self, session_id, session_name=None, member_id_list=None):
        """Updates the session_name and/or member_id_list for an existing session.
        member_id_list should be a comma-separated string (e.g., "user_001,user_002").
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if session_name:
                cursor.execute(f"""
                    UPDATE {self.table_name}
                    SET session_name = ?, last_updated = ?
                    WHERE session_id = ?
                """, (session_name, datetime.now().isoformat(), session_id))
            if member_id_list:
                # Ensure member_id_list is a string, not a list
                if isinstance(member_id_list, list):
                    member_id_list = ','.join(member_id_list)
                cursor.execute(f"""
                    UPDATE {self.table_name}
                    SET member_id_list = ?, last_updated = ?
                    WHERE session_id = ?
                """, (member_id_list, datetime.now().isoformat(), session_id))
            conn.commit()

    def fix_corrupted_member_lists(self):
        """Fix corrupted member_id_list entries where characters are separated by commas.
        This happens when a string was joined character-by-character instead of as a list.
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Get all sessions
            cursor.execute(f"SELECT session_id, owner_id, member_id_list FROM {self.table_name}")
            rows = cursor.fetchall()

            fixed_count = 0
            for row in rows:
                session_id, owner_id, member_id_list = row

                # Check if member_id_list looks corrupted (has many single characters separated by commas)
                # A corrupted list would have pattern like "u,s,e,r,_,0,0,1" instead of "user_001"
                if member_id_list and ',' in member_id_list:
                    parts = member_id_list.split(',')
                    # If most parts are single characters, it's likely corrupted
                    single_char_parts = sum(1 for p in parts if len(p.strip()) == 1)
                    if single_char_parts > len(parts) * 0.5:  # More than 50% are single characters
                        # Try to reconstruct: if owner_id is "user_001", the corrupted version would be "u,s,e,r,_,0,0,1"
                        # Reconstruct by joining all parts
                        reconstructed = ''.join(parts)

                        # If reconstructed matches owner_id pattern, use owner_id
                        # Otherwise, try to find valid user_id patterns
                        if reconstructed.startswith('user_'):
                            # Use the reconstructed string if it looks like a valid user_id
                            fixed_member_list = reconstructed
                        else:
                            # Fallback: use owner_id as the only member
                            fixed_member_list = owner_id

                        cursor.execute(f"""
                            UPDATE {self.table_name}
                            SET member_id_list = ?, last_updated = ?
                            WHERE session_id = ?
                        """, (fixed_member_list, datetime.now().isoformat(), session_id))
                        fixed_count += 1
                        print(f"Fixed session {session_id}: '{member_id_list}' -> '{fixed_member_list}'")

            conn.commit()
            return fixed_count

    def get(self, session_id):
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

    def delete(self, session_id):
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

    def join_session(self, session_id, user_id):
        """Adds a user to a session's member_id_list if they're not already in it."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Get current session
            cursor.execute(f"""
                SELECT member_id_list FROM {self.table_name}
                WHERE session_id = ?
            """, (session_id,))
            row = cursor.fetchone()

            if not row:
                return False  # Session doesn't exist

            current_member_list = row[0] or ""
            # Parse current members
            current_members = [m.strip() for m in current_member_list.split(",") if m.strip()]

            # Check if user is already in the list
            if user_id in current_members:
                return True  # User already in session

            # Add user to the list
            current_members.append(user_id)
            new_member_list = ','.join(current_members)

            # Update the session
            cursor.execute(f"""
                UPDATE {self.table_name}
                SET member_id_list = ?, last_updated = ?
                WHERE session_id = ?
            """, (new_member_list, datetime.now().isoformat(), session_id))
            conn.commit()
            return True

    def get_all(self, user_id):
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
