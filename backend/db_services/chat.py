import sqlite3
from config import DATABASE_PATH
from datetime import datetime
import uuid

class ChatManager:
    """Manages chat history persistence using a simple SQLite database."""

    def __init__(self, db_path="burbla.db"):
        self.db_path = db_path
        self.table_name = "chat_sessions"
        self._initialize_db()

    def _initialize_db(self):
        """Creates the necessary table if it doesn't exist."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {self.table_name} (
                    session_id TEXT,
                    user_id TEXT NOT NULL,
                    message_id TEXT,
                    content TEXT NOT NULL,
                    timestamp TEXT
                )
            """)

    def save_chat_message(self, session_id, user_id, message_id, content):
        """Saves a single chat message to the database."""
        current_time = datetime.now().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_sessions (session_id, user_id, content, message_id, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (session_id, user_id, content, message_id, current_time))

    def load_chat_history(self, session_id):
        """Loads the chat history for a given session ID. If not found, creates a new session with a bot message."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Check if the session exists
            cursor.execute("""
                SELECT * FROM chat_sessions WHERE session_id = ?
            """, (session_id,))
            rows = cursor.fetchall()

            # If no session is found, create a new one with a bot message
            if not rows:
                bot_message_id = str(uuid.uuid4())  # Generate a unique message ID
                bot_content = "I am Burbla, how can I help you today?"
                current_time = datetime.now().isoformat()
                cursor.execute("""
                    INSERT INTO chat_sessions (session_id, user_id, message_id, content, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                """, (session_id, "bot", bot_message_id, bot_content, current_time))
                conn.commit()
                return [{
                    "session_id": session_id,
                    "user_id": "bot",
                    "message_id": bot_message_id,
                    "content": bot_content,
                    "timestamp": current_time
                }]

            # If session exists, return the chat history
            return [
                {
                    "session_id": row[0],
                    "user_id": row[1],
                    "message_id": row[2],
                    "content": row[3],
                    "timestamp": row[4]
                }
                for row in rows
            ]

    def delete_chat_session(self, session_id):
        """Deletes a chat session from the database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM chat_sessions
                WHERE session_id = ?
            """, (session_id,))
