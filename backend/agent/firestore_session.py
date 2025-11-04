"""
Firestore-backed Session Service for Google ADK
Provides persistent conversation storage in Google Cloud Firestore
"""
from google.adk.sessions import SessionService
from google.cloud import firestore
from google.genai import types
import os
from datetime import datetime
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class FirestoreSessionService(SessionService):
    """Custom Firestore-backed session service for persistent conversation storage."""

    def __init__(self, project_id: str, collection_name: str = "agent_sessions"):
        """
        Initialize Firestore session service.

        Args:
            project_id: Google Cloud project ID
            collection_name: Firestore collection name for storing sessions
        """
        try:
            self.db = firestore.Client(project=project_id)
            self.collection_name = collection_name
            self.collection = self.db.collection(collection_name)
            logger.info(f"FirestoreSessionService initialized: project={project_id}, collection={collection_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Firestore client: {e}")
            raise

    def _get_session_key(self, app_name: str, user_id: str, session_id: str) -> str:
        """Generate unique session key."""
        return f"{app_name}:{user_id}:{session_id}"

    async def create_session(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create or retrieve a session.

        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session identifier

        Returns:
            Session data dictionary
        """
        session_key = self._get_session_key(app_name, user_id, session_id)
        session_ref = self.collection.document(session_key)

        try:
            # Check if session exists
            doc = session_ref.get()
            if doc.exists:
                logger.info(f"Session found: {session_key}")
                return doc.to_dict()

            # Create new session
            session_data = {
                "app_name": app_name,
                "user_id": user_id,
                "session_id": session_id,
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
                "messages": [],
                "metadata": kwargs
            }
            session_ref.set(session_data)
            logger.info(f"Session created: {session_key}")

            # Return with actual timestamp
            doc = session_ref.get()
            return doc.to_dict()

        except Exception as e:
            logger.error(f"Error creating session {session_key}: {e}")
            raise

    async def get_session(
        self,
        app_name: str,
        user_id: str,
        session_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve a session.

        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session identifier

        Returns:
            Session data dictionary or None if not found
        """
        session_key = self._get_session_key(app_name, user_id, session_id)
        session_ref = self.collection.document(session_key)

        try:
            doc = session_ref.get()
            if not doc.exists:
                logger.warning(f"Session not found: {session_key}")
                return None

            logger.info(f"Session retrieved: {session_key}")
            return doc.to_dict()

        except Exception as e:
            logger.error(f"Error retrieving session {session_key}: {e}")
            raise

    async def update_session(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
        data: Dict[str, Any]
    ):
        """
        Update session data.

        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session identifier
            data: Data to update
        """
        session_key = self._get_session_key(app_name, user_id, session_id)
        session_ref = self.collection.document(session_key)

        try:
            data["updated_at"] = firestore.SERVER_TIMESTAMP
            session_ref.update(data)
            logger.info(f"Session updated: {session_key}")

        except Exception as e:
            logger.error(f"Error updating session {session_key}: {e}")
            raise

    async def delete_session(
        self,
        app_name: str,
        user_id: str,
        session_id: str
    ):
        """
        Delete a session.

        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session identifier
        """
        session_key = self._get_session_key(app_name, user_id, session_id)
        session_ref = self.collection.document(session_key)

        try:
            session_ref.delete()
            logger.info(f"Session deleted: {session_key}")

        except Exception as e:
            logger.error(f"Error deleting session {session_key}: {e}")
            raise

    async def list_sessions(
        self,
        app_name: str,
        user_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List all sessions for a user.

        Args:
            app_name: Application name
            user_id: User identifier
            limit: Maximum number of sessions to return

        Returns:
            List of session data dictionaries
        """
        try:
            query = (
                self.collection
                .where("app_name", "==", app_name)
                .where("user_id", "==", user_id)
                .order_by("updated_at", direction=firestore.Query.DESCENDING)
                .limit(limit)
            )

            sessions = []
            for doc in query.stream():
                session_data = doc.to_dict()
                session_data["_id"] = doc.id
                sessions.append(session_data)

            logger.info(f"Listed {len(sessions)} sessions for user {user_id}")
            return sessions

        except Exception as e:
            logger.error(f"Error listing sessions for {app_name}:{user_id}: {e}")
            raise

    async def add_message(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
        role: str,
        content: str
    ):
        """
        Add a message to the session history.

        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session identifier
            role: Message role (user/assistant)
            content: Message content
        """
        session_key = self._get_session_key(app_name, user_id, session_id)
        session_ref = self.collection.document(session_key)

        try:
            message = {
                "role": role,
                "content": content,
                "timestamp": firestore.SERVER_TIMESTAMP
            }

            session_ref.update({
                "messages": firestore.ArrayUnion([message]),
                "updated_at": firestore.SERVER_TIMESTAMP
            })

            logger.debug(f"Message added to session {session_key}: {role}")

        except Exception as e:
            logger.error(f"Error adding message to session {session_key}: {e}")
            raise

    async def get_message_history(
        self,
        app_name: str,
        user_id: str,
        session_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get message history for a session.

        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session identifier

        Returns:
            List of messages
        """
        session = await self.get_session(app_name, user_id, session_id)
        if not session:
            return []

        return session.get("messages", [])

    def close(self):
        """Close the Firestore client."""
        try:
            self.db.close()
            logger.info("Firestore client closed")
        except Exception as e:
            logger.error(f"Error closing Firestore client: {e}")
