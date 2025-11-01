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
        "name": "Test User",
        "message": "Find Italian restaurants in Houston 77083 and generate a vote",
        "id": "",
        "is_to_agent": True
    }

    print(f"📤 Sending: {payload['message']}")
    response = requests.post(f"{BASE_URL}/sent", json=payload)

    if response.status_code == 200:
        result = response.json()
        print("\n✅ Response received:")

        try:
            message_content = json.loads(result['message'])
            print("\n🎉 SUCCESS - Pure JSON returned:")
            print(json.dumps(message_content, indent=2))

            if message_content.get('type') == 'vote_card':
                print(f"\n✅ Vote card with {len(message_content['content']['vote_options'])} options")
        except json.JSONDecodeError:
            print("\n❌ FAILED - Response is text, not JSON:")
            print(result['message'])
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
        "name": "Test User",
        "message": "What's the weather like today?",
        "id": "",
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
