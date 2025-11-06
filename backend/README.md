# 🍔 Burpla - Food Recommendation Agent

AI-powered food recommendation agent using Google ADK and Gemini.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start server
python main.py

# Test agent
python cli.py
```

## Features

- 🍕 Restaurant search and recommendations
- 📍 Distance calculations
- 🗳️ Create voting polls for group decisions
- 🔍 Up-to-date web search
- 💬 Persistent conversations (with Firestore)
- 🎯 Context-aware responses

## Usage

```
You: Find Italian restaurants in Houston
Burpla: Here are 5 great Italian restaurants...

You: Create a vote for these restaurants
Burpla: [Creates voting poll with details]

You: What did I search for earlier?
Burpla: You searched for Italian restaurants in Houston
```

## Configuration

Edit `.env`:
```bash
GOOGLE_API_KEY=your_key_here

# Optional: Enable Firestore for persistent storage
USE_FIRESTORE=false
GOOGLE_CLOUD_PROJECT=your-project-id
```

## Documentation

- **SETUP.md** - Detailed setup instructions
- **FIRESTORE_QUICKSTART.md** - Enable persistent storage

## Architecture

```
Client (test_client.py)
    ↓
FastAPI Server (main.py)
    ↓
Agent Layer (agent.py)
    ├─ Root Agent (coordinates)
    ├─ Tools (search, distance, etc)
    └─ Sub-agents (vote generation)
    ↓
Session Storage
    ├─ In-Memory (default)
    └─ Firestore (optional)
```

## API

- **POST /sent** - Send message to agent
- **GET /storage_info** - Check storage type
- **GET /sessions/{user_id}** - List conversations
- **DELETE /session/{id}** - Delete conversation

Docs: http://localhost:8000/docs

## Tech Stack

- **Google ADK** - Agent framework
- **Gemini 2.0** - LLM model
- **FastAPI** - Web framework
- **Firestore** - Persistent storage (optional)
- **Google Places API** - Restaurant data

## Development

```bash
# Enable Firestore
./setup_firestore.sh

# Run tests
python test_client.py

# View API docs
open http://localhost:8000/docs
```

## License

MIT

# Main User flow
1 Log in: Sign in with gmail 
2 Sign up 
3 Initialize convo based on user_id. /convo_init 
4 Click on session /get_session
5 User go to chat and click sent /sent
6 User click vote 


