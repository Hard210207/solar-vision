"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Dynamically import the map so it only loads on the browser
const MapCanvas = dynamic(() => import("../components/MapCanvas"), { ssr: false });

export default function SolarEstimatePage() {
  const [roofCoordinates, setRoofCoordinates] = useState<[number, number][]>([]);

  // This is the single, updated function. It sits INSIDE the component so it has access to state.
  const handleConfirmArea = async (points: [number, number][]) => {
    setRoofCoordinates(points);
    console.log("Sending coordinates to Python...", points);
    
    try {
      const response = await fetch("https://solar-vision-backend.onrender.com/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: points }),
      });

      const result = await response.json();
      
      console.log("BACKEND RESPONSE:", result);
      
      if (result.status === "success") {
        // Pop up the final math for the demo!
        alert(`Calculated!\n\nUsable Area: ${result.area_sq_meters} sq meters\nMax System Size: ${result.system_capacity_kw} kW\nEstimated Cost: ₹${result.estimated_cost_inr.toLocaleString()}`);
      } else {
        alert("Error calculating area.");
      }
    } catch (error) {
      console.error("Backend connection failed:", error);
      alert("Could not connect to the Python backend. Is it running on port 8000?");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10">
      <h1 className="text-3xl font-bold mb-2">Step 1: Map Your Roof</h1>
      <p className="text-gray-600 mb-6">Click the corners of your usable roof space on the satellite map.</p>
      
      {/* Render the Map */}
      <MapCanvas onConfirmArea={handleConfirmArea} />
    </div>
  );
}