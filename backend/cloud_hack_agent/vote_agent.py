import re
from typing import Optional, Dict, Any
from .tools import google_places_text_search, generate_vote

class VoteAgent:
    """
    Sequential agent that handles the vote generation flow.
    Steps:
    1. Search for restaurants using query
    2. Extract place IDs from search results
    3. Generate vote card with place IDs
    4. Return pure JSON
    """

    def should_handle(self, message: str) -> bool:
        """Detect if this message should trigger vote generation"""
        vote_keywords = ['vote', 'voting', 'generate vote', 'create vote', 'poll']
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in vote_keywords)

    def extract_location_query(self, message: str) -> Optional[str]:
        """Extract restaurant search query from user message"""
        patterns = [
            r'find\s+(.+?)\s+in\s+(.+?)(?:\s+and|\s+then|$)',
            r'search\s+(.+?)\s+in\s+(.+?)(?:\s+and|\s+then|$)',
            r'(.+?)\s+in\s+(.+?)(?:\s+and|\s+then|$)',
            r'restaurants?\s+in\s+(.+?)(?:\s+and|\s+then|$)',
        ]

        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    return f"{groups[0].strip()} in {groups[1].strip()}"
                elif len(groups) == 1:
                    return f"restaurants in {groups[0].strip()}"

        words = message.split()
        for i, word in enumerate(words):
            if word.lower() == 'in' and i + 1 < len(words):
                location = ' '.join(words[i+1:]).split(' and')[0].split(' then')[0]
                if i > 0:
                    cuisine = ' '.join(words[:i])
                    return f"{cuisine} in {location}"
                return f"restaurants in {location}"

        return None

    def execute(self, message: str) -> Dict[Any, Any]:
        """
        Execute the sequential vote generation flow.
        Returns pure JSON vote card.
        """
        query = self.extract_location_query(message)

        if not query:
            return {
                "error": "Could not extract location from message",
                "message": "Please specify a location like 'Italian restaurants in Houston 77083'"
            }

        search_result = google_places_text_search(query)

        if "error" in search_result:
            return {
                "error": "Search failed",
                "details": search_result["error"]
            }

        places = search_result.get("places", [])
        if not places:
            return {
                "error": "No restaurants found",
                "query": query
            }

        place_ids = [place["id"] for place in places[:5]]

        vote_card = generate_vote(place_ids)

        return vote_card

vote_agent = VoteAgent()
