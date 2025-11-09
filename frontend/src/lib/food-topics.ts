/**
 * Food topic names for session naming
 * These are human-friendly food-related topics that can be used as default session names
 */

export const FOOD_TOPICS = [
  "Italian Cuisine",
  "Sushi & Japanese",
  "Mexican Fiesta",
  "BBQ & Grilling",
  "Pizza Night",
  "Thai Food",
  "Chinese Takeout",
  "Indian Curry",
  "Mediterranean",
  "French Bistro",
  "Korean BBQ",
  "Vietnamese Pho",
  "Greek Taverna",
  "Seafood Feast",
  "Steakhouse",
  "Burger Joint",
  "Taco Tuesday",
  "Ramen Shop",
  "Dim Sum",
  "Tapas & Spanish",
  "Brazilian Churrasco",
  "Ethiopian",
  "Lebanese",
  "Turkish Delight",
  "Peruvian",
  "Moroccan Tagine",
  "Southern Comfort",
  "Cajun & Creole",
  "Farm to Table",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dessert & Sweets",
  "Breakfast & Brunch",
  "Coffee & Pastries",
  "Wine & Cheese",
  "Cocktails & Appetizers",
  "Street Food",
  "Food Truck",
  "Fine Dining",
  "Casual Eats",
  "Fast Food",
  "Healthy Options",
  "Comfort Food",
  "Spicy Food",
  "Asian Fusion",
  "Latin American",
  "Middle Eastern",
  "European",
  "American Classic",
];

/**
 * Get a random food topic name
 */
export function getRandomFoodTopic(): string {
  return FOOD_TOPICS[Math.floor(Math.random() * FOOD_TOPICS.length)];
}

