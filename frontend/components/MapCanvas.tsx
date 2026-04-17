"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapClickHandler({ addPoint }: { addPoint: (latlng: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      addPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 19); 
  }, [center, map]);
  return null;
}

export default function MapCanvas({ onConfirmArea, center }: { onConfirmArea: (points: [number, number][]) => void, center: [number, number] }) {
  const [points, setPoints] = useState<[number, number][]>([]);

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
    onConfirmArea(points);
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer center={center} zoom={18} scrollWheelZoom={true} className="w-full h-full z-10">
        <ChangeMapView center={center} />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
        />
        <MapClickHandler addPoint={handleAddPoint} />
        {points.map((pos, idx) => (
          <Marker key={idx} position={pos} />
        ))}
        {points.length > 1 && (
          <Polygon positions={points} pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.4 }} />
        )}
      </MapContainer>

      {/* FIXED BUTTONS: Now beautifully themed and safely positioned at the bottom inside the map */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[400] flex gap-4 w-[90%] md:w-auto justify-center">
        <button 
          onClick={clearMap}
          className="px-6 py-3 bg-slate-900/90 backdrop-blur-md text-slate-300 font-semibold rounded-xl border border-slate-700 hover:bg-slate-800 hover:text-white transition shadow-xl"
        >
          Clear Shape
        </button>
        <button 
          onClick={handleConfirm}
          className="px-6 py-3 bg-amber-500 text-slate-900 font-extrabold rounded-xl hover:bg-amber-400 transition shadow-xl shadow-amber-500/20"
        >
          Calculate Roof Area
        </button>
      </div>
    </div>
  );
}