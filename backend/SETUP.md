# Burpla Agent Setup

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Server
```bash
python main.py
```

### 3. Test in Terminal
```bash
# In another terminal
python test_client.py
```

## How It Works

### Current Setup (In-Memory)
- Conversations stored in RAM
- Lost on server restart
- Good for testing

### With Firestore (Persistent)
- Conversations stored in Google Cloud
- Survives restarts
- Scales to multiple servers

## Enable Firestore (Optional)

### Quick Setup
```bash
./setup_firestore.sh
```

### Manual Setup
1. Create Google Cloud project
2. Enable Firestore API
3. Download credentials
4. Update `.env`:
   ```
   USE_FIRESTORE=true
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./firestore-key.json
   ```

See `FIRESTORE_QUICKSTART.md` for detailed instructions.

## Test Client

The test client uses **fixed session ID**: `my_conversation_001`

This means:
- Same conversation every time you run it
- Agent remembers previous messages (if Firestore enabled)
- Use `/clear` to start fresh

### Commands:
- Type your message to chat
- `/health` - Check server status
- `/clear` - Clear conversation
- `/exit` - Quit

## Conversation Flow

```
1. Test client sends message with fixed session_id
   ↓
2. Server checks if session exists
   ↓
3. If new: Creates session in storage (Firestore or in-memory)
   If exists: Loads conversation history
   ↓
4. Agent reads history and processes message
   ↓
5. Runner automatically saves:
   - User message to session
   - Agent response to session
   ↓
6. Response sent back to client
```

## API Endpoints

- `POST /sent` - Send message
- `GET /health` - Health check
- `GET /storage_info` - Check storage type
- `GET /sessions/{user_id}` - List sessions (Firestore only)
- `GET /session/{id}/history` - Get conversation (Firestore only)
- `DELETE /session/{id}` - Delete session
- `POST /clear_session` - Clear session

## Models

Current: `gemini-2.0-flash-exp` (supports function calling)

Available models:
- `gemini-2.0-flash-exp` - Fast, experimental
- `gemini-1.5-flash` - Stable, fast
- `gemini-1.5-pro` - More capable

Edit `agent/config.py` to change models.

## Tools Available

1. **google_places_text_search** - Find restaurants
2. **distance_matrix** - Calculate distances
3. **google_search** - Up-to-date web search
4. **generate_vote_agent** - Create voting polls

## Troubleshooting

**"Tool use with function calling is unsupported"**
- Restart the server after changing models

**Sessions not persisting**
- Check `USE_FIRESTORE=true` in .env
- Verify Firestore credentials

**Connection errors**
- Make sure server is running on port 8000
- Check firewall settings

## Files Structure

```
backend/
├── main.py                 # FastAPI server
├── test_client.py          # Terminal test client
├── agent/
│   ├── agent.py           # Main agent logic
│   ├── sub_agent.py       # Vote generation agent
│   ├── config.py          # Configuration
│   ├── tools.py           # Custom tools
│   └── firestore_session.py  # Firestore storage
├── .env                    # Environment variables
├── requirements.txt        # Dependencies
└── setup_firestore.sh     # Firestore setup script
```

## Next Steps

1. Test basic conversation
2. Enable Firestore for persistence
3. Deploy to production (Cloud Run recommended)
4. Add more tools/agents as needed
