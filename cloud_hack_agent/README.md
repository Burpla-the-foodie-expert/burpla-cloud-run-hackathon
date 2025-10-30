# Cloud Hack Agent

A multi-tool agent powered by Google ADK that can answer questions about weather, time, and places using Google Places API.

## Features

### Tools Available:

1. **Weather Tool** - Get weather information for cities
2. **Time Tool** - Get current time in different cities
3. **Places Search Tool** - Search for restaurants, hotels, attractions, and other points of interest
4. **Place Details Tool** - Get detailed information about a specific place by ID

## Setup

### 1. Environment Variables

Make sure your `.env` file in the `cloud_hack_agent` folder contains:

```
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=0
```

### 2. Google API Requirements

Your Google API key needs access to:
- **Gemini API** (for the AI agent)
- **Places API** (for place searches)
- **Geocoding API** (for location lookups)

## Usage

### In Python Code

```python
from dotenv import load_dotenv
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from cloud_hack_agent.agent import root_agent

# Load environment variables
load_dotenv(dotenv_path="cloud_hack_agent/.env", override=True)

# Initialize the Runner
session_service = InMemorySessionService()
runner = Runner(
    app_name="cloud_hack_assistant",
    agent=root_agent,
    session_service=session_service
)

# Query the agent
query = "Find me Italian restaurants in New York"
input_content = [Content(role="user", parts=[Part(text=query)])]

response = runner.run(
    user_id="test_user",
    session_id="test_session",
    contents=input_content
)

print(response.content.parts[0].text)
```

### Run Test Script

```bash
python test_places_agent.py
```

## Places Tool Parameters

The `search_places` tool accepts:

- **query** (required): Search query (e.g., "pizza", "hotels near Times Square")
- **location** (optional): Location to search near (e.g., "New York" or coordinates)
- **radius** (optional): Search radius in meters (default: 5000, max: 50000)
- **place_type** (optional): Type of place ("restaurant", "cafe", "hotel", "museum", etc.)
- **min_rating** (optional): Minimum rating from 0 to 5
- **price_level** (optional): Price level from 1 (cheapest) to 4 (most expensive)
- **open_now** (optional): Filter for places currently open (true/false)

## Example Queries

### Weather Queries
- "What is the weather like in New York?"
- "Tell me about the weather in New York"

### Time Queries
- "What time is it in New York?"
- "What's the current time in New York?"

### Places Queries
- "Find me Italian restaurants in New York"
- "Show me coffee shops near Times Square"
- "Where can I find highly rated hotels in Manhattan?"
- "Find vegan restaurants in New York with rating above 4.5"
- "What are some good pizza places in Brooklyn?"
- "Show me museums in New York"

### Combined Queries
- "What's the weather in New York and recommend a good restaurant?"
- "What time is it in New York? Also find me a coffee shop nearby."

## Response Format

The agent will provide natural language responses with:
- Place names and addresses
- Ratings and number of reviews
- Price levels
- Opening hours
- Phone numbers and websites
- Customer reviews (top 3)

## Price Levels

- **1**: Inexpensive ($ - under $10)
- **2**: Moderate ($$ - $10-25)
- **3**: Expensive ($$$ - $25-45)
- **4**: Very Expensive ($$$$ - over $45)

## Troubleshooting

### API Key Issues
If you get an error about the API key:
1. Verify your `.env` file has the correct `GOOGLE_API_KEY`
2. Ensure the API key has the required APIs enabled in Google Cloud Console
3. Check that billing is enabled for your Google Cloud project

### No Results
If searches return no results:
1. Try a broader search query
2. Increase the search radius
3. Remove or adjust filters (min_rating, price_level)
4. Verify the location name is correct

## Files

- `agent.py` - Main agent configuration with all tools
- `places_tool.py` - Google Places API integration
- `.env` - Environment variables (API keys)
- `README.md` - This file

## Notes

- The Places tool returns up to 10 places per search, sorted by rating
- Each place includes up to 3 recent reviews
- Search radius is capped at 50,000 meters (50km)
- Make sure your Google API key has proper billing enabled for production use
