import sqlite3
from config import DATABASE_PATH
from datetime import datetime

class UserManager:
    """Manages Users."""

    def __init__(self, db_path="burbla.db"):
        self.db_path = db_path
        self.table_name = "users"
        self._initialize_db()

    def _initialize_db(self):
        """Creates the necessary table if it doesn't exist."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {self.table_name} (
                    user_id TEXT,
                    name TEXT,
                    gmail TEXT,
                    preferences TEXT,
                    location TEXT,
                    added_date datetime DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Check if table is empty and add 3 random users if it is
            cursor.execute(f"SELECT COUNT(*) FROM {self.table_name}")
            count = cursor.fetchone()[0]

            if count == 0:
                # Add 3 random users
                random_users = [
                    ("user_001", "Huy Bui", "williamhuybui@gmail.com", "Vietnamese noodle, Bun Bo Hue", "Pearland, TX 77047"),
                    ("user_002", "Huy Nguyen", "huynguyen.me@gmail.com", "Pho, springroll", "Cypress, TX 77429"),
                    ("user_003", "Weber Chen", "weberchen85@gmail.com", "Beijing duck, dumbling", "Houston, TX 77084")
                ]

                cursor.executemany(f"""
                    INSERT INTO {self.table_name} (user_id, name, gmail, preferences, location)
                    VALUES (?, ?, ?, ?, ?)
                """, random_users)
                conn.commit()

    def add_user(self, user_id, name, gmail, preferences, location):
        """Adds a new user to the database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                INSERT INTO {self.table_name} (user_id, name, gmail, preferences, location)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, name, gmail, preferences, location))
    
    def get_user(self, user_id):
        """Retrieves a user from the database by user_id."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT * FROM {self.table_name}
                WHERE user_id = ?
            """, (user_id,))
            return cursor.fetchone()
    
    def delete_user(self, user_id):
        """Deletes a user from the database by user_id."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                DELETE FROM {self.table_name}
                WHERE user_id = ?
            """, (user_id,))
    
    def update_user(self, user_id, name=None, gmail=None, preferences=None, location=None):
        """Updates user information in the database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            fields = []
            values = []
            if name is not None:
                fields.append("name = ?")
                values.append(name)
            if gmail is not None:
                fields.append("gmail = ?")
                values.append(gmail)
            if preferences is not None:
                fields.append("preferences = ?")
                values.append(preferences)
            if location is not None:
                fields.append("location = ?")
                values.append(location)
            values.append(user_id)
            set_clause = ", ".join(fields)
            cursor.execute(f"""
                UPDATE {self.table_name}
                SET {set_clause}
                WHERE user_id = ?
            """, values)
    
    # Added 
    # Huy Bui, 