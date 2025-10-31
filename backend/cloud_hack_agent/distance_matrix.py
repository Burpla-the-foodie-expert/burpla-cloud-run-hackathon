import googlemaps
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")
gmaps = googlemaps.Client(key=API_KEY)

ORIGIN = "Houston, TX"
DESTINATION = "Austin, TX"

result = gmaps.distance_matrix(
    origins=[ORIGIN],
    destinations=[DESTINATION],
    mode="driving",
    units="imperial"
)

print(result)