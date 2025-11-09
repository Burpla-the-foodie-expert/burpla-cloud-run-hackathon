#!/usr/bin/env python3
"""
Script to remove all sessions for a specific user.
This will:
1. Find all sessions where the user is the owner or in member_id_list
2. Delete those sessions from the convo table
3. Delete associated chat messages from chat_sessions table
"""

import sqlite3
import sys
import os

# Database path
DB_PATH = "burbla.db"

def remove_user_sessions(user_id: str):
    """Remove all sessions for a specific user"""

    if not os.path.exists(DB_PATH):
        print(f"Error: Database file {DB_PATH} not found")
        return False

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        # Find all sessions where user is owner or in member_id_list
        cursor.execute("""
            SELECT session_id, session_name, owner_id, member_id_list
            FROM convo
            WHERE owner_id = ? OR member_id_list LIKE ?
        """, (user_id, f"%{user_id}%"))

        sessions = cursor.fetchall()

        if not sessions:
            print(f"No sessions found for user {user_id}")
            return True

        print(f"Found {len(sessions)} session(s) for user {user_id}:")
        for session_id, session_name, owner_id, member_id_list in sessions:
            print(f"  - {session_id}: {session_name} (owner: {owner_id}, members: {member_id_list})")

        # Confirm deletion (skip if running non-interactively)
        if sys.stdin.isatty():
            response = input(f"\nDelete all {len(sessions)} session(s)? (yes/no): ")
            if response.lower() != 'yes':
                print("Cancelled.")
                return False
        else:
            print(f"\nAuto-confirming deletion of {len(sessions)} session(s)...")

        # Delete chat messages for these sessions
        session_ids = [s[0] for s in sessions]
        placeholders = ','.join(['?'] * len(session_ids))

        cursor.execute(f"""
            DELETE FROM chat_sessions
            WHERE session_id IN ({placeholders})
        """, session_ids)
        chat_deleted = cursor.rowcount

        # Delete sessions from convo table
        cursor.execute(f"""
            DELETE FROM convo
            WHERE session_id IN ({placeholders})
        """, session_ids)
        sessions_deleted = cursor.rowcount

        conn.commit()

        print(f"\nSuccessfully deleted:")
        print(f"  - {sessions_deleted} session(s) from convo table")
        print(f"  - {chat_deleted} chat message(s) from chat_sessions table")

        return True

if __name__ == "__main__":
    user_id = "user_49090983"

    if len(sys.argv) > 1:
        user_id = sys.argv[1]

    print(f"Removing all sessions for user: {user_id}\n")
    success = remove_user_sessions(user_id)

    sys.exit(0 if success else 1)

