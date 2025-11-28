from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from .tools import (
    distance_matrix,
    google_places_text_search,
    generate_vote,
    google_places_get_id
)
from dotenv import load_dotenv
import os

load_dotenv(override=True)

# Initialize the model
model = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0
)

# Define the tools
tools = [
    distance_matrix,
    google_places_text_search,
    generate_vote,
    google_places_get_id
]

# Initialize memory
memory = MemorySaver()

# Create the agent
agent = create_react_agent(model, tools, checkpointer=memory)
