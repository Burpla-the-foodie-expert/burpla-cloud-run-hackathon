import sqlite3
from config import DATABASE_PATH
from datetime import datetime
import uuid, json
from db_services.user import UserManager

class ChatManager:
    """Manages chat history persistence using a simple SQLite database."""

    def __init__(self, db_path="burbla.db"):
        self.db_path = db_path
        self.table_name = "chat_sessions"
        self.user_manager = UserManager(db_path)
        self._initialize_db()

    def _initialize_db(self):
        """Creates the necessary table if it doesn't exist."""
        with sqlite3.connect(self.db_path) as conn:
            # Enable foreign key constraints
            conn.execute("PRAGMA foreign_keys = ON")

            cursor = conn.cursor()

            # Check if table exists
            cursor.execute(f"""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name='{self.table_name}'
            """)
            table_exists = cursor.fetchone()

            if not table_exists:
                # Create table (note: SQLite foreign keys are checked but not enforced by default)
                # We'll validate in save_chat_message instead
                cursor.execute(f"""
                    CREATE TABLE {self.table_name} (
                        session_id TEXT,
                        user_id TEXT NOT NULL,
                        message_id TEXT,
                        content TEXT NOT NULL,
                        timestamp TEXT
                    )
                """)
            else:
                # Table exists - migrate invalid user_ids if needed
                self._migrate_invalid_user_ids(cursor)

            conn.commit()

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

    def _migrate_invalid_user_ids(self, cursor):
        """Migrate invalid user_ids in chat_sessions to valid ones from users table.
        This handles old messages with frontend-generated user_ids that don't exist in users table.
        For timestamp-based IDs, we can't automatically map them, so they remain for historical purposes.
        """
        # Get all distinct user_ids from chat_sessions that are not 'bot', 'burpla', or 'ai'
        cursor.execute("""
            SELECT DISTINCT user_id FROM chat_sessions
            WHERE user_id NOT IN ('bot', 'burpla', 'ai')
        """)
        chat_user_ids = [row[0] for row in cursor.fetchall()]

        # Get all valid user_ids from users table
        cursor.execute("SELECT user_id FROM users")
        valid_user_ids = {row[0] for row in cursor.fetchall()}

        # Find invalid user_ids (those not in users table)
        invalid_user_ids = [uid for uid in chat_user_ids if uid not in valid_user_ids]

        if invalid_user_ids:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Found {len(invalid_user_ids)} invalid user_ids in chat_sessions: {invalid_user_ids}")
            logger.warning("These are likely old frontend-generated IDs. New messages will use authenticated user_ids.")
            # Note: We don't automatically migrate these as we can't determine which user they belong to
            # The validation in save_chat_message will ensure all new messages use valid user_ids


    def get_invalid_user_ids(self):
        """Get a list of invalid user_ids in chat_sessions that don't exist in users table."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Get all distinct user_ids from chat_sessions
            cursor.execute("""
                SELECT DISTINCT user_id FROM chat_sessions
                WHERE user_id NOT IN ('bot', 'burpla', 'ai')
            """)
            chat_user_ids = {row[0] for row in cursor.fetchall()}

            # Get all valid user_ids from users table
            cursor.execute("SELECT user_id FROM users")
            valid_user_ids = {row[0] for row in cursor.fetchall()}

            # Return invalid user_ids
            return list(chat_user_ids - valid_user_ids)

    def migrate_user_id(self, old_user_id, new_user_id):
        """Migrate all messages with old_user_id to new_user_id.
        Useful for fixing old invalid user_ids.
        """
        # Validate that new_user_id exists
        new_user_info = self.user_manager.get_user(new_user_id)
        if not new_user_info:
            raise ValueError(f"New user_id {new_user_id} does not exist in users table")

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE chat_sessions
                SET user_id = ?
                WHERE user_id = ?
            """, (new_user_id, old_user_id))
            conn.commit()
            return cursor.rowcount


    def save_chat_message(self, session_id, user_id, message_id, content):
        """Saves a single chat message to the database.
        Validates that user_id exists in users table (except for 'bot', 'burpla', 'ai' which are special).
        Raises ValueError if user_id is invalid.
        """
        # Special case: 'bot', 'burpla', 'ai' are allowed without validation
        if user_id not in ['bot', 'burpla', 'ai']:
            # Validate that user_id exists in users table
            user_info = self.user_manager.get_user(user_id)
            if not user_info:
                # User doesn't exist - this is an error
                import logging
                logger = logging.getLogger(__name__)
                error_msg = f"User {user_id} not found in users table. Cannot save message. Please ensure user is authenticated first."
                logger.error(error_msg)
                raise ValueError(error_msg)

        current_time = datetime.now().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            # Enable foreign keys
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.cursor()

            try:
                cursor.execute("""
                    INSERT INTO chat_sessions (session_id, user_id, content, message_id, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                """, (session_id, user_id, content, message_id, current_time))
                conn.commit()
            except sqlite3.IntegrityError as e:
                # Foreign key constraint violation (if foreign keys were enforced)
                import logging
                logger = logging.getLogger(__name__)
                error_msg = f"Foreign key constraint violation: {e}. User {user_id} not found in users table."
                logger.error(error_msg)
                raise ValueError(error_msg) from e

    def load_chat_history(self, session_id):
        """Loads the chat history for a given session ID. Returns empty list if session doesn't exist."""
        with sqlite3.connect(self.db_path) as conn:
            # Enable foreign keys
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.cursor()
            # Check if the session exists
            cursor.execute("""
                SELECT * FROM chat_sessions WHERE session_id = ?
            """, (session_id,))
            rows = cursor.fetchall()

            # If no session is found, return empty list (don't create a new session)
            if not rows:
                return []

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
    
    def initialize_chat_session(self, session_id):
        """Initializes a new chat session with a bot welcome message.
        Only call this when explicitly creating a new session."""
        with sqlite3.connect(self.db_path) as conn:
            # Enable foreign keys
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.cursor()

            # Check if the session already exists
            cursor.execute("""
                SELECT * FROM chat_sessions WHERE session_id = ?
            """, (session_id,))
            rows = cursor.fetchall()

            # If session already exists, return existing messages
            if rows:
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

            # Create a new session with a bot message
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
            print(f"[VOTE] Content from DB: {content}")
            print(f"[VOTE] Content type: {type(content)}")

            # Try to parse as JSON
            try:
                vote_card = json.loads(content)
            except json.JSONDecodeError as e:
                # If JSON parsing fails, try to handle Python dict string representation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to parse content as JSON: {e}")
                logger.error(f"Content that failed to parse: {repr(content)}")

                # Try using ast.literal_eval as fallback (for Python dict strings)
                try:
                    import ast
                    vote_card = ast.literal_eval(content)
                    logger.info("Successfully parsed content using ast.literal_eval")
                except (ValueError, SyntaxError) as ast_error:
                    logger.error(f"Failed to parse content with ast.literal_eval: {ast_error}")
                    raise ValueError(
                        f"Content is not valid JSON or Python dict. "
                        f"JSON error: {str(e)}. "
                        f"Content preview: {str(content)[:200]}"
                    )

            # Validate that vote_card is a dict
            if not isinstance(vote_card, dict):
                raise ValueError(f"Content is not a valid vote card (expected dict, got {type(vote_card)})")

            updated = False
            restaurant_name = None

            # Initialize vote_user_id_list and number_of_vote for all options
            for option in vote_card.get("vote_options", []):
                if "vote_user_id_list" not in option:
                    option["vote_user_id_list"] = []
                if "number_of_vote" not in option:
                    option["number_of_vote"] = 0  # Initialize if not present

            # If user is voting up, first remove their vote from any other option
            # This prevents users from having multiple votes in the same vote card
            if is_vote_up:
                for option in vote_card.get("vote_options", []):
                    if option["restaurant_id"] != vote_option_id and user_id in option["vote_user_id_list"]:
                        # User has voted for a different option, remove that vote
                        option["vote_user_id_list"].remove(user_id)
                        option["number_of_vote"] = max(0, option["number_of_vote"] - 1)
                        updated = True

            # Now handle the vote for the target option
            for option in vote_card.get("vote_options", []):
                if option["restaurant_id"] == vote_option_id:
                    restaurant_name = option.get("restaurant_name", "this restaurant")
                    if is_vote_up:
                        if user_id not in option["vote_user_id_list"]:
                            option["vote_user_id_list"].append(user_id)
                            option["number_of_vote"] += 1  # Increment the vote count
                            updated = True
                    else:
                        if user_id in option["vote_user_id_list"]:
                            option["vote_user_id_list"].remove(user_id)
                            option["number_of_vote"] = max(0, option["number_of_vote"] - 1)  # Decrement the vote count
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

            # Return restaurant name for chat message creation
            return restaurant_name if updated else None
