import sqlite3
from config import DATABASE_PATH
from datetime import datetime
import uuid

class UserManager:
    """Manages Users."""

    def __init__(self, db_path="burbla.db"):
        self.db_path = db_path
        self.table_name = "users"
        self._initialize_db()

    def _initialize_db(self):
        """Creates the necessary table if it doesn't exist."""
        with sqlite3.connect(self.db_path, timeout=10) as conn:  # Add timeout
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
                    ("user_001", "Huy Bui", "williamhuybui@gmail.com", "Vietnamese noodle, Bun Bo Hue", "3519 Liberty Dr. Pearland, TX 77581"),
                    ("user_002", "Huy Nguyen", "huynguyen.me@gmail.com", "Pho, springroll", "17515 Swansbury Dr, Cypress, TX 77429"),
                    ("user_003", "Weber Chen", "weberchen85@gmail.com", "Beijing duck, dumbling", "6565 W Loop S #300, Bellaire, TX 77401"),
                    ("user_004", "Bing", "bingcello@gmail.com", "Fast food", "2103 Lyons Ave Building 2, Houston, TX 77020"),
                    ("user_005", "Nam Truong", "quanhnamlamruong3@gmail.com", "Everything", "301 8th St, Galveston, TX 77555"),
                    ("user_006", "Ceiba", "cei3pentandra@gmail.com", "Everything", "13201 Bellaire Blvd, Houston, TX 77083"),
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
            # Use INSERT OR IGNORE to avoid errors if user already exists
            cursor.execute(f"""
                INSERT OR IGNORE INTO {self.table_name} (user_id, name, gmail, preferences, location)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, name, gmail, preferences, location))
            conn.commit()
    
    def get_user(self, user_id):
        """Retrieves a user from the database by user_id."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT * FROM {self.table_name}
                WHERE user_id = ?
            """, (user_id,))
            return cursor.fetchone()

    def get_user_by_gmail(self, gmail):
        """Retrieves a user from the database by gmail."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT * FROM {self.table_name}
                WHERE gmail = ?
            """, (gmail,))
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

    def authentication(self, gmail, name=None):
        """Authenticate user by gmail. Creates user if they don't exist.
        Updates name if provided and different from existing name.

        Returns:
            tuple: (is_authenticated: bool, user_id: str or None)
        """
        try:
            with sqlite3.connect(self.db_path, timeout=10) as conn:
                cursor = conn.cursor()
                # Check if user exists
                cursor.execute(f"SELECT user_id, name FROM {self.table_name} WHERE gmail = ?", (gmail,))
                existing_user = cursor.fetchone()

                if existing_user:
                    # User exists, check if name needs updating
                    user_id = existing_user[0]
                    existing_name = existing_user[1]

                    # Update name if provided and different
                    if name and name != existing_name:
                        cursor.execute(f"""
                            UPDATE {self.table_name}
                            SET name = ?
                            WHERE user_id = ?
                        """, (name, user_id))
                        conn.commit()

                    return True, user_id

                # User doesn't exist, create a new user
                # Generate user_id based on email (use email prefix + hash for uniqueness)
                user_id = f"user_{uuid.uuid4().hex[:8]}"

                # Use provided name or derive from email
                user_name = name if name else gmail.split("@")[0]

                # Insert new user
                cursor.execute(f"""
                    INSERT INTO {self.table_name} (user_id, name, gmail, preferences, location)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, user_name, gmail, None, None))
                conn.commit()

                return True, user_id
        except Exception as e:
            import traceback
            print(f"Error in authentication method: {e}")
            print(traceback.format_exc())
            # Return False on error so the endpoint can handle it
            return False, None
