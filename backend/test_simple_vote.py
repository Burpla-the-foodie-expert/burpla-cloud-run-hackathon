#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8000"
SESSION_ID = "debug_session_001"

# Step 1: Get restaurants
print("Step 1: Getting restaurants...")
response1 = requests.post(f"{BASE_URL}/sent", json={
    "user_id": 1,
    "message": "Show me top 5 Vietnamese restaurants in Houston",
    "message_id": "msg_001",
    "session_id": SESSION_ID,
    "is_to_agent": True
})
print(f"Response 1: {response1.json().get('message')}")

# Step 2: Generate vote
print("Step 2: Generating vote...")
response2 = requests.post(f"{BASE_URL}/sent", json={
    "user_id": 1,
    "message": "Generate vote for top 3",
    "message_id": "msg_002",
    "session_id": SESSION_ID,
    "is_to_agent": True
})
print(f"Response 2: {response2.json().get('message')}")
