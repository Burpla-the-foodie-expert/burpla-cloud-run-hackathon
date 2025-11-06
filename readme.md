Get an API key from Google AI Studio.
https://aistudio.google.com/api-keys

# Set up .env

GOOGLE_GENAI_USE_VERTEXAI = FALSE

GOOGLE_API_KEY = PASTE_YOUR_ACTUAL_API_KEY_HERE

# Development

## Running Both Services

You can start both the backend and frontend development servers using one of the following methods:

### Option 1: Using npm (Recommended)

```bash
# Install dependencies (first time only)
npm install

# Start both servers
npm run dev
```

This will start:

- Backend API on http://localhost:8000
- Frontend app on http://localhost:3000

### Option 2: Using the shell script

```bash
# Make sure the script is executable (first time only)
chmod +x scripts/dev.sh

# Run the script
./scripts/dev.sh
```

### Running Services Separately

If you prefer to run services separately:

```bash
# Backend only
npm run dev:backend
# or
cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend only
npm run dev:frontend
# or
cd frontend && pnpm dev
```

## Installing Dependencies

```bash
# Install all dependencies (backend and frontend)
npm run install:all

# Or install separately
npm run install:backend  # Installs Python dependencies with Poetry
npm run install:frontend # Installs Node.js dependencies with pnpm
```

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
