import sqlite3
from config import DATABASE_PATH
from datetime import datetime
import uuid, json

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

            # Check if table is empty and add 1 convo if it is
            default_session  = "session_003"
            cursor.execute(f"SELECT COUNT(*) FROM {self.table_name} WHERE session_id = '{default_session}'")
            count = cursor.fetchone()[0]
            if count == 0:
                with open('db_services/sample.json', 'r') as file:
                    sample = json.load(file)
                for msg in sample:
                    cursor.execute(f"""
                        INSERT INTO {self.table_name} (session_id, user_id, message_id, content, timestamp)
                        VALUES (?, ?, ?, ?, ?)
                    """, (default_session, msg['user_id'], msg['message_id'], msg['content'], msg['timestamp']))


    def save_chat_message(self, session_id, user_id, message_id, content):
        """Saves a single chat message to the database."""
        current_time = datetime.now().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_sessions (session_id, user_id, content, message_id, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (session_id, user_id, content, message_id, current_time))
            conn.commit()

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


    def record_vote(self, session_id, user_id, message_id, vote_option_id, is_vote_up):
        """Records a vote for a restaurant in a conversation session.

            Example vote card format:
            {
                "message_id": "msg_001",
                "sender_name": "pipeline_vote_agent",
                "type": "vote_card",
                "vote_options": [
                    {
                        "restaurant_id": "ChIJ456",
                        "restaurant_name": "Luigi’s Trattoria",
                        "description": "Italian trattoria famous for homemade pasta.",
                        "image": "https://example.com/luigi.jpg",
                        "rating": "4.6",
                        "userRatingCount": 210,
                        "number_of_vote": 1
                        "vote_user_id_list": [user_001],
                        "map": "https://maps.google.com/?q=Luigi’s+Trattoria"
                    },
                    {
                        "restaurant_id": "ChIJ789",
                        "restaurant_name": "Curry Palace",
                        "description": "Spicy and flavorful Indian cuisine.",
                        "image": "https://example.com/curry.jpg",
                        "rating": "4.5",
                        "userRatingCount": 150,
                        "number_of_vote": 0
                        "vote_user_id_list": [],
                        "map": "https://maps.google.com/?q=Curry+Palace"
                    }
                ]
            }
        """
        # Find message by message_id
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT content FROM chat_sessions
                WHERE session_id = ? AND message_id = ?
            """, (session_id, message_id))
            row = cursor.fetchone()
            if not row:
                raise ValueError("Message ID not found in the specified session.")

            content = row[0]
            print(content)
            vote_card = json.loads(content)
            updated = False
            for option in vote_card.get("vote_options", []):
                if "vote_user_id_list" not in option:
                    option["vote_user_id_list"] = []

                if "number_of_vote" not in option:
                    option["number_of_vote"] = 0  # Initialize if not present

                if option["restaurant_id"] == vote_option_id:
                    if is_vote_up:
                        if user_id not in option["vote_user_id_list"]:
                            option["vote_user_id_list"].append(user_id)
                            option["number_of_vote"] += 1  # Increment the vote count
                            updated = True
                    else:
                        if user_id in option["vote_user_id_list"]:
                            option["vote_user_id_list"].remove(user_id)
                            option["number_of_vote"] -= 1  # Decrement the vote count
                            updated = True

                if updated:
                    # Update the message content in the database
                    new_content = json.dumps(vote_card)
                    timestamp = datetime.now().isoformat()
                    cursor.execute("""
                        UPDATE chat_sessions
                        SET content = ?, timestamp = ?
                        WHERE session_id = ? AND message_id = ?
                    """, (new_content, timestamp, session_id, message_id))
                    conn.commit()
