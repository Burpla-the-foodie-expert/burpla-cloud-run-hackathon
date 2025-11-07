Get an API key from Google AI Studio.
https://aistudio.google.com/api-keys

# Set up .env

GOOGLE_GENAI_USE_VERTEXAI = FALSE

GOOGLE_API_KEY = PASTE_YOUR_ACTUAL_API_KEY_HERE

// TODO And Frontend

### Backend Setup with Poetry

The backend uses Poetry for dependency management. Make sure Poetry is installed:

```bash
# Install Poetry if you don't have it
curl -sSL https://install.python-poetry.org | python3 -

# Or on macOS with Homebrew
brew install poetry
```

Then install backend dependencies:

```bash
cd backend
poetry install
```

This will create a virtual environment and install all required packages including:

- FastAPI
- Uvicorn
- google-genai
- python-dotenv
- requests
- googlemaps

To run backend commands with Poetry:

```bash
cd backend
poetry run uvicorn main:app --reload  # Development server
poetry run python main.py             # Run directly
```

## Frontend Configuration

The frontend is now configured to use the Python backend API instead of Next.js API routes.

### Environment Variables

Create a `.env.local` file in the `frontend` directory (optional, defaults work for local development):

```bash
# Backend Python API URL
# Default: http://localhost:8000 (when running backend locally)
# In production, set this to your deployed backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### API Endpoints

The frontend calls these backend endpoints:

- `POST /sent` - Send message to AI agent
- `GET /init` - Get list of conversations
- `POST /convo` - Get conversation by ID
- `GET /health` - Health check
- `GET /` - API information

Note: Session management (`/api/sessions`) still uses Next.js API routes for frontend-only state management.
Secrets:
GCP_PROJECT_ID = burpla
GCP_SA_EMAIL = github-actions-deployer@burpla.iam.gserviceaccount.com
GCP_WIF_PROVIDER = projects/415080714475/locations/global/workloadIdentityPools/github-pool/providers/github-provider

https://console.cloud.google.com/run?project=burpla
https://burpla-ui-415080714475.northamerica-northeast1.run.app/?session=2ajlkhw-dqf8ph4
