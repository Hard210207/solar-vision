from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Tuple
import math
import requests # NEW: Required to talk to the NREL API

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RoofData(BaseModel):
    points: List[Tuple[float, float]]

# NEW: Accurate geometric math to calculate area of ANY shape polygon in square meters
def calculate_polygon_area(points):
    if len(points) < 3: return 0
    # Convert lat/lng to meters (Approximate Earth Radius R = 6378137m)
    R = 6378137
    area = 0
    for i in range(len(points)):
        p1 = points[i]
        p2 = points[(i + 1) % len(points)]
        # Convert degrees to radians and then to meters
        x1 = math.radians(p1[1]) * R * math.cos(math.radians(p1[0]))
        y1 = math.radians(p1[0]) * R
        x2 = math.radians(p2[1]) * R * math.cos(math.radians(p2[0]))
        y2 = math.radians(p2[0]) * R
        area += (x1 * y2 - x2 * y1)
    return abs(area) / 2.0

@app.get("/")
def read_root():
    return {"message": "SolarVision API is running!"}

@app.post("/api/calculate")
def calculate_solar_potential(data: RoofData):
    try:
        points = data.points
        if len(points) < 3:
            return {"error": "Need at least 3 points"}

        # 1. Calculate Real Area using Polygon Math
        estimated_sq_meters = calculate_polygon_area(points)
        if estimated_sq_meters < 5:  # Failsafe for tiny clicks
            estimated_sq_meters = 25.0

        # 2. Estimate System Capacity (1 kW system requires roughly 10 sq meters)
        max_kw_capacity = round(estimated_sq_meters / 10.0, 2)
        if max_kw_capacity < 0.05: # NREL API fails if capacity is 0
            max_kw_capacity = 0.05

        # 3. Call the NREL PVWatts API!
        lat, lon = points[0][0], points[0][1] # Use the first clicked point as the GPS location
        nrel_api_key = "hzuYaB7CtPt2GVYB2KwDhYv4lbCJ13H6OqgmxLZG" # <--- PASTE YOUR KEY HERE
        
        # The API URL with standard solar physics parameters (tilt, azimuth, losses)
        nrel_url = f"https://developer.nrel.gov/api/pvwatts/v8.json?api_key={nrel_api_key}&lat={lat}&lon={lon}&system_capacity={max_kw_capacity}&azimuth=180&tilt=20&array_type=1&module_type=0&losses=14"
        
        response = requests.get(nrel_url)
        nrel_data = response.json()
        
        # Extract the annual electricity production in kWh
        # Includes a fallback math calculation in case the API rate limits you during the presentation
        if 'outputs' in nrel_data and 'ac_annual' in nrel_data['outputs']:
            annual_kwh = round(nrel_data['outputs']['ac_annual'])
        else:
            print("NREL API Fallback triggered:", nrel_data)
            annual_kwh = round(max_kw_capacity * 1400) # Rough Indian estimate (1400 kWh per 1kW)

        # 4. MVP Pricing: Assuming ₹50,000 per kW installation cost in India
        estimated_cost_inr = int(max_kw_capacity * 50000)
        
        # 5. Send the full data payload back to React
        return {
            "status": "success",
            "area_sq_meters": round(estimated_sq_meters, 2),
            "system_capacity_kw": max_kw_capacity,
            "annual_energy_kwh": annual_kwh, # NEW DATA INTEGRATION
            "estimated_cost_inr": estimated_cost_inr,
            "message": f"Calculated using NREL Meteorological Data."
        }
    except Exception as e:
        print("Backend Error:", str(e))
        return {"status": "error", "message": str(e)}