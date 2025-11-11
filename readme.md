# Burpla 🍽️

**AI-powered group dining decisions made effortless**

Burpla is an intelligent chat assistant that helps groups quickly decide where to eat. By analyzing conversation context and leveraging Google Maps data, Burpla suggests restaurants and creates instant polls to eliminate decision fatigue. No more endless scrolling or circular discussions—just great food decisions.

## ✨ Inspiration

Every group of friends has faced that moment: everyone is hungry, but no one can decide where to eat. The conversation goes in circles, and thirty minutes later, you're still scrolling through restaurants. That's where Burpla was born.

We wanted to create an app that makes food decisions effortless. With Burpla, you chat just like in any other messaging app, except there is a food expert quietly listening in, ready to suggest the perfect restaurant or create a poll tailored to everyone's location.

What started as a simple idea to make dining decisions easier has grown into an intelligent, map-powered assistant that brings people together through food.

## 🎯 What It Does

- **Context-aware recommendations** - Burpla agent connects to Google Search Places and Google Maps APIs, ensuring every recommendation is accurate and location-aware
- **Group chat sessions** - Users can chat directly with Burpla or invite friends to a shared session where everyone can interact with the AI together  
- **Interactive templates** - Clean templates for restaurant recommendations and voting results, making it easy to open maps, view restaurant details, or jump to external links
- **Visual map experience** - Displays user and restaurant locations as interactive pins on a map, creating a smooth and visual experience
- **Smart polling system** - Creates instant polls from conversation context and announces winners
- **Fair meeting spots** - Balances distance and ETA for all group members using advanced algorithms

## 🏗️ How We Built It

**Concept & Prototyping**: Our journey began in AI Studio, where we brainstormed, prototyped, and generated the initial backend structure and prompt logic before refining it with custom code.

**Frontend**: Built with React and Next.js to deliver a fast, responsive, and intuitive experience. It integrates live map data, group polls, and chat sessions seamlessly across devices.

**Backend**: Powered by FastAPI and Google ADK, the backend runs fully on Google Cloud Run as a serverless service. A system of AI agents collaboration—one interprets user intent, and the others generate restaurant recommendations or polls using Google Places and Google Maps APIs. We used a SQL database for persistent chat memory and Pydantic for data validation.

**Deployment**: The app is containerized with Docker and deployed through GitHub Actions to Google Cloud Run, ensuring fast, automated updates. We also integrated Cloud Storage for assets and Cloud Logging for performance monitoring.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and pnpm/npm
- **Python 3.11+** 
- **Poetry** (Python package manager)
- **Google API Keys** (AI Studio, Maps, Places)

### Option 1: Quick Development Setup

Run both servers with one command:

```bash
# Make the script executable and run
chmod +x scripts/dev.sh
./scripts/dev.sh
```

This will start:
- Backend server on `http://localhost:8000`
- Frontend server on `http://localhost:3000`

### Option 2: Manual Setup

#### 1. Get API Keys

1. **Google AI Studio API Key**: Get from [https://aistudio.google.com/api-keys](https://aistudio.google.com/api-keys)
2. **Google Maps API Key**: Enable Places API and Maps JavaScript API in [Google Cloud Console](https://console.cloud.google.com/)
3. **Google OAuth Credentials**: Set up OAuth 2.0 client in Google Cloud Console for authentication

#### 2. Backend Setup

Create `backend/.env`:

```bash
GOOGLE_GENAI_USE_VERTEXAI=0
GOOGLE_API_KEY=your_google_ai_studio_key_here
GOOGLE_MAP_API=your_google_maps_key_here
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_LOCATION=us-south1
```

Install and run backend:

```bash
# Install Poetry if needed
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies and run
cd backend
poetry install
poetry run uvicorn main:app --reload
```

#### 3. Frontend Setup

Create `frontend/.env.local`:

```bash
# Backend API Configuration
BACKEND_API_URL=http://127.0.0.1:8000

# Google OAuth (for authentication)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string

# Google Maps Integration (frontend)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_maps_key
```

Install and run frontend:

```bash
cd frontend
pnpm install
pnpm dev
```

## 🔧 Configuration Details

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID for "Web application"
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret to your `.env.local`

Generate a secure NextAuth secret:
```bash
openssl rand -base64 32
```

### API Keys Required

| Service | Purpose | Configuration |
|---------|---------|---------------|
| Google AI Studio | Gemini AI model access | `GOOGLE_API_KEY` in backend |
| Google Maps API | Places search, directions | `GOOGLE_MAP_API` in backend |
| Google OAuth | User authentication | `GOOGLE_CLIENT_ID/SECRET` in frontend |

## 📊 Architecture Overview

```
Frontend (Next.js/React)
    ↓ HTTP/WebSocket
Backend (FastAPI + Google ADK)
    ├─ Orchestrator Agent (main coordinator)
    ├─ Recommendation Card Agent
    ├─ Vote Card Agent  
    └─ Tools Integration
        ├─ Google Places API
        ├─ Google Maps Distance Matrix
        └─ Custom polling logic
    ↓
Database Layer
    ├─ SQLite (local development)
    └─ Cloud SQL (production)
```

### Agent System
Our modular agent system uses pipelines to handle:
- **Conversation logic** - Understanding user intent and context
- **Memory management** - Persistent chat history across sessions  
- **Real-time recommendations** - Location-aware restaurant suggestions
- **Polling coordination** - Fair voting mechanisms for group decisions

## 💻 Development

### Project Structure

```
burpla/
├── frontend/                 # Next.js React application
│   ├── src/
│   │   ├── app/             # Next.js 13+ app router
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities and configurations
│   └── .env.local           # Frontend environment variables
├── backend/                 # FastAPI Python service
│   ├── agent_gadk/         # Google ADK agent implementation
│   ├── routers/            # API route handlers
│   ├── db_services/        # Database management
│   ├── tools/              # Google Maps integration
│   └── .env                # Backend environment variables
└── scripts/
    └── dev.sh              # Development startup script
```

### Key Features Implementation

- **Restaurant Search**: Google Places API integration with location-based filtering
- **Distance Calculations**: Google Distance Matrix for fair meeting point algorithms  
- **Voting System**: Custom polling logic with real-time updates
- **Session Management**: Persistent chat memory with user authentication
- **Map Integration**: Interactive maps with restaurant pins and directions

## 🧪 Testing & Development

### API Documentation
- Backend API docs: `http://localhost:8000/docs` (FastAPI automatic docs)
- Health check: `http://localhost:8000/health`

### Key Endpoints
- `POST /sent` - Send message to AI agent
- `GET /init` - Initialize conversation  
- `POST /convo` - Get conversation by ID
- `GET /sessions/{user_id}` - List user conversations

### Running Tests
```bash
# Backend tests
cd backend
poetry run pytest

# Frontend tests  
cd frontend
pnpm test
```

## 🚀 Deployment

The application is deployed on Google Cloud Run with automated CI/CD:

- **Production**: [burpla-ui-415080714475.northamerica-northeast1.run.app](https://burpla-ui-415080714475.northamerica-northeast1.run.app)
- **Console**: [Google Cloud Console](https://console.cloud.google.com/run?project=burpla)

### Deployment Configuration
- Containerized with Docker (see `Dockerfile` in each directory)
- GitHub Actions for CI/CD pipeline
- Google Cloud Run for serverless scaling
- Environment variables managed through Cloud Console

## 🎓 What We Learned

- **Google Cloud Run & ADK**: Deep dive into Google's agent development tools and cloud services
- **Success Strategy**: Plan carefully, research thoroughly, and execute with focus  
- **AI Tool Discipline**: Tools like Cursor, AI Studio, or Claude are powerful allies, but require thoughtful use to avoid breaking code or wasting resources
- **Agent Architecture**: Modular sub-agents perform better than monolithic agents with too many instructions

## 🔮 What's Next

- **Richer group presence** - Calendar integration and reservation management
- **Preference learning** - Dietary constraints and personal taste profiles  
- **Enhanced safety features** - End-to-end trip status with auto-expire
- **Advanced multi-agent workflows** - "Just choose for us" with detailed explanations
- **One-click deployment** - "Deploy to Run" link from AI Studio for reproducible deployments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project was built for the Google Cloud Run Hackathon. MIT License.
