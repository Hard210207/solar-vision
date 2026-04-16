"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for Leaflet marker icons not showing up in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Component to handle mouse clicks on the map
function MapClickHandler({ addPoint }: { addPoint: (latlng: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      addPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function MapCanvas({ onConfirmArea }: { onConfirmArea: (points: [number, number][]) => void }) {
  const [points, setPoints] = useState<[number, number][]>([]);

  // Coordinates for the center (Defaulting to a central view)
  const centerPosition: [number, number] = [23.0225, 72.5714]; 

  const handleAddPoint = (latlng: [number, number]) => {
    setPoints((prev) => [...prev, latlng]);
  };

  const clearMap = () => {
    setPoints([]);
  };

  const handleConfirm = () => {
    if (points.length < 3) {
      alert("Please click at least 3 points on the roof to draw a shape.");
      return;
    }
    // Pass the drawn coordinates back to your main form
    onConfirmArea(points);
  };

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border-2 border-slate-300 shadow-lg">
      <MapContainer center={centerPosition} zoom={18} scrollWheelZoom={true} className="w-full h-full">
        {/* Free High-Res Satellite Tiles from Esri */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        />
        
        <MapClickHandler addPoint={handleAddPoint} />

        {/* Draw the markers where the user clicks */}
        {points.map((pos, idx) => (
          <Marker key={idx} position={pos} />
        ))}

        {/* Draw the polygon connecting the dots */}
        {points.length > 1 && (
          <Polygon positions={points} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.4 }} />
        )}
      </MapContainer>

      {/* Control Panel UI floating over the map */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] flex gap-4 bg-white/90 p-3 rounded-lg shadow-xl backdrop-blur-sm">
        <button 
          onClick={clearMap}
          className="px-4 py-2 bg-red-100 text-red-600 font-semibold rounded-md hover:bg-red-200 transition"
        >
          Clear Shape
        </button>
        <button 
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition"
        >
          Calculate Roof Area
        </button>
      </div>
    </div>
  );
}