import requests
import json

BASE_URL = "http://localhost:8000"

def test_vote_generation():
    """Test vote generation - should return pure JSON"""
    print("="*60)
    print("TEST 1: Vote Generation")
    print("="*60)

    payload = {
        "user_id": 1,
        "message": "Find Italian restaurants in Houston 77083 and generate a vote",
        "message_id": "test_msg_001",
        "session_id": "test_session_vote",
        "is_to_agent": True
    }

    print(f"📤 Sending: {payload['message']}")
    response = requests.post(f"{BASE_URL}/sent", json=payload)

    if response.status_code == 200:
        result = response.json()
        print("\n✅ Response received:")
        print(f"Response keys: {result.keys()}")

        # The response should have a 'message' field
        agent_response = result.get('message', '')
        print(f"\n📝 Agent response:\n{agent_response[:200]}...")

        # Try to parse as JSON if it looks like vote data
        if 'vote_options' in agent_response or 'vote_card' in agent_response:
            try:
                message_content = json.loads(agent_response)
                print("\n🎉 SUCCESS - Pure JSON returned:")
                print(json.dumps(message_content, indent=2))

                if message_content.get('type') == 'vote_card':
                    print(f"\n✅ Vote card with {len(message_content.get('vote_options', []))} options")
            except json.JSONDecodeError:
                print("\n⚠️  Vote data mentioned but not valid JSON")
        else:
            print("\n📝 Text response (not vote JSON)")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

def test_normal_chat():
    """Test normal chat - should return conversational text"""
    print("\n" + "="*60)
    print("TEST 2: Normal Chat")
    print("="*60)

    payload = {
        "user_id": 1,
        "message": "Find good tacos in Houston",
        "message_id": "test_msg_002",
        "session_id": "test_session_chat",
        "is_to_agent": True
    }

    print(f"📤 Sending: {payload['message']}")
    response = requests.post(f"{BASE_URL}/sent", json=payload)

    if response.status_code == 200:
        result = response.json()
        print("\n✅ Response received:")
        print(f"💬 Agent says: {result['message']}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_vote_generation()
    test_normal_chat()
