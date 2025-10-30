from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from my_agent.tools import search_restaurants
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="my_agent/.env")

# Initialize FastAPI app
app = FastAPI(
    title="FastAPI Template",
    description="A template for FastAPI applications",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    total_price: float

class RestaurantSearchRequest(BaseModel):
    location: str
    radius: Optional[int] = 5000
    keyword: Optional[str] = None
    min_rating: Optional[float] = None
    price_level: Optional[int] = None
    open_now: Optional[bool] = False

class Review(BaseModel):
    author: str
    rating: float
    text: str
    time: str

class Restaurant(BaseModel):
    name: str
    address: str
    location: Dict[str, float]
    rating: float
    total_ratings: int
    price_level: int
    types: List[str]
    opening_hours: Optional[bool]
    place_id: str
    reviews: List[Review]

class RestaurantSearchResponse(BaseModel):
    location: str
    total_results: int
    restaurants: List[Restaurant]

# In-memory storage (replace with database in production)
items_db = {}
item_counter = 0

# Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to FastAPI Template",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/items/", response_model=ItemResponse, status_code=201)
async def create_item(item: Item):
    """Create a new item"""
    global item_counter
    item_counter += 1

    total_price = item.price + (item.tax if item.tax else 0)

    item_data = {
        "id": item_counter,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "total_price": total_price
    }

    items_db[item_counter] = item_data
    return item_data

@app.get("/items/{item_id}", response_model=ItemResponse)
async def read_item(item_id: int):
    """Get an item by ID"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return items_db[item_id]

@app.get("/items/")
async def list_items(skip: int = 0, limit: int = 10):
    """List all items with pagination"""
    items = list(items_db.values())
    return items[skip : skip + limit]

@app.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, item: Item):
    """Update an existing item"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")

    total_price = item.price + (item.tax if item.tax else 0)

    item_data = {
        "id": item_id,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "total_price": total_price
    }

    items_db[item_id] = item_data
    return item_data

@app.delete("/items/{item_id}")
async def delete_item(item_id: int):
    """Delete an item"""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")

    del items_db[item_id]
    return {"message": "Item deleted successfully"}

@app.post("/restaurants/search")
async def search_restaurants_endpoint(request: RestaurantSearchRequest):
    """
    Search for restaurant recommendations using Google Places API.

    Args:
        request: RestaurantSearchRequest containing search parameters

    Returns:
        Restaurant recommendations with location, ratings, reviews, and details
    """
    try:
        result = search_restaurants(
            location=request.location,
            radius=request.radius,
            keyword=request.keyword,
            min_rating=request.min_rating,
            price_level=request.price_level,
            open_now=request.open_now
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search restaurants: {str(e)}")

@app.get("/restaurants/search")
async def search_restaurants_get(
    location: str,
    radius: int = 5000,
    keyword: Optional[str] = None,
    min_rating: Optional[float] = None,
    price_level: Optional[int] = None,
    open_now: bool = False
):
    """
    Search for restaurant recommendations using query parameters.

    Query parameters:
        location: Location to search (required)
        radius: Search radius in meters (default: 5000)
        keyword: Keyword filter (optional)
        min_rating: Minimum rating 0-5 (optional)
        price_level: Price level 1-4 (optional)
        open_now: Filter for open restaurants (default: false)
    """
    try:
        result = search_restaurants(
            location=location,
            radius=radius,
            keyword=keyword,
            min_rating=min_rating,
            price_level=price_level,
            open_now=open_now
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search restaurants: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
