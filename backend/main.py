from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Tuple
import math

app = FastAPI()

# This is the magic bridge that allows your React app to talk to Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define what data we expect from the frontend
class RoofData(BaseModel):
    points: List[Tuple[float, float]]

@app.get("/")
def read_root():
    return {"message": "SolarVision API is running!"}

@app.post("/api/calculate")
def calculate_solar_potential(data: RoofData):
    # 1. MVP Area Calculation (Rough bounding box estimate based on clicks)
    if len(data.points) < 3:
        return {"error": "Need at least 3 points"}
    
    # Simple hack for the hackathon MVP: Use the distance between first two points 
    # to estimate a square meter area. (1 degree lat/lng is ~111,000 meters)
    lat1, lon1 = data.points[0]
    lat2, lon2 = data.points[1]
    
    width_meters = abs(lon2 - lon1) * 111000
    height_meters = abs(lat2 - lat1) * 111000
    
    # Failsafe if they click too close together
    estimated_sq_meters = max((width_meters * height_meters), 25.0) 

    # 2. The Solar Math
    # Assuming 1 kW system requires roughly 10 sq meters of space
    max_kw_capacity = round(estimated_sq_meters / 10.0, 1)
    
    # MVP Pricing: Assuming ₹50,000 per kW installation cost in India
    estimated_cost_inr = int(max_kw_capacity * 50000)
    
    # 3. Send the formatted report back to the frontend
    return {
        "status": "success",
        "area_sq_meters": round(estimated_sq_meters, 2),
        "system_capacity_kw": max_kw_capacity,
        "estimated_cost_inr": estimated_cost_inr,
        "message": f"Your roof can support a {max_kw_capacity}kW system costing roughly ₹{estimated_cost_inr:,}."
    }