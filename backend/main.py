from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Tuple
import math
import requests

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

def calculate_polygon_area(points):
    if len(points) < 3: return 0
    R = 6378137
    area = 0
    for i in range(len(points)):
        p1 = points[i]
        p2 = points[(i + 1) % len(points)]
        x1 = math.radians(p1[1]) * R * math.cos(math.radians(p1[0]))
        y1 = math.radians(p1[0]) * R
        x2 = math.radians(p2[1]) * R * math.cos(math.radians(p2[0]))
        y2 = math.radians(p2[0]) * R
        area += (x1 * y2 - x2 * y1)
    return abs(area) / 2.0

def calculate_pm_surya_ghar_subsidy(kw):
    # Official PM Surya Ghar Subsidy Logic (Approximate for 2024/2025)
    if kw <= 2:
        return kw * 30000
    elif kw <= 3:
        return 60000 + ((kw - 2) * 18000)
    else:
        return 78000 # Max subsidy is capped at 78,000 INR

@app.post("/api/calculate")
def calculate_solar_potential(data: RoofData):
    try:
        points = data.points
        if len(points) < 3:
            return {"error": "Need at least 3 points"}

        estimated_sq_meters = calculate_polygon_area(points)
        if estimated_sq_meters < 5: estimated_sq_meters = 25.0

        max_kw_capacity = round(estimated_sq_meters / 10.0, 2)
        if max_kw_capacity < 0.05: max_kw_capacity = 0.05

        lat, lon = points[0][0], points[0][1] 
        nrel_api_key = "hzuYaB7CtPt2GVYB2KwDhYv4lbCJ13H6OqgmxLZG" # <--- PASTE YOUR KEY HERE
        
        nrel_url = f"https://developer.nrel.gov/api/pvwatts/v8.json?api_key={nrel_api_key}&lat={lat}&lon={lon}&system_capacity={max_kw_capacity}&azimuth=180&tilt=20&array_type=1&module_type=0&losses=14"
        
        response = requests.get(nrel_url)
        nrel_data = response.json()
        
        if 'outputs' in nrel_data and 'ac_annual' in nrel_data['outputs']:
            annual_kwh = round(nrel_data['outputs']['ac_annual'])
        else:
            annual_kwh = round(max_kw_capacity * 1400) 

        # Indian Financial Math
        cost_per_kw = 50000
        gross_cost = int(max_kw_capacity * cost_per_kw)
        subsidy = int(calculate_pm_surya_ghar_subsidy(max_kw_capacity))
        net_cost = gross_cost - subsidy

        # Environmental Impact Math (Indian Grid Avg: ~0.82 kg CO2 per kWh)
        co2_saved_kg = annual_kwh * 0.82
        co2_saved_tons = round(co2_saved_kg / 1000, 1)
        cars_taken_off = round(co2_saved_tons / 4.6, 1) # Approx 4.6 tons per passenger car/year
        trees_planted = round(co2_saved_tons * 16.5) # Approx 16.5 trees per ton over 10 years

        return {
            "status": "success",
            "area_sq_meters": round(estimated_sq_meters, 2),
            "system_capacity_kw": max_kw_capacity,
            "annual_energy_kwh": annual_kwh,
            "financials": {
                "gross_cost": gross_cost,
                "subsidy": subsidy,
                "net_cost": net_cost
            },
            "environment": {
                "co2_tons": co2_saved_tons,
                "cars": cars_taken_off,
                "trees": trees_planted
            },
            "message": "Calculated using NREL Data & PM Surya Ghar Guidelines."
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}