"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const MapCanvas = dynamic(() => import("../components/MapCanvas"), { ssr: false });

export default function SolarEstimatePage() {
  const [roofCoordinates, setRoofCoordinates] = useState<[number, number][]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([23.0225, 72.5714]); 
  
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [financeTab, setFinanceTab] = useState("buy");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setMapCenter([position.coords.latitude, position.coords.longitude]),
        (error) => console.log("Location access denied.")
      );
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleConfirmArea = async (points: [number, number][]) => {
    setRoofCoordinates(points);
    setIsCalculating(true);
    setCalculationResult(null); 
    
    try {
      const response = await fetch("https://solar-vision-backend.onrender.com/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: points }),
      });
      const result = await response.json();
      if (result.status === "success") setCalculationResult(result);
    } catch (error) {
      console.error("Backend connection failed");
    } finally {
      setIsCalculating(false);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 flex flex-col scroll-smooth">
      
      {/* HEADER - Fixed overlapping issue with z-[9999] */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-[9999]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☀️</span>
            <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
              SolarSence
            </span>
          </div>
          {/* Nav Links - Now smooth scroll to sections */}
          <nav className="hidden md:flex gap-8 text-sm font-semibold text-slate-300">
            <a href="#savings-estimator" className="hover:text-amber-400 transition">Savings Estimator</a>
            <a href="#solar-101" className="hover:text-amber-400 transition">Solar 101</a>
            <a href="#faq" className="hover:text-amber-400 transition">FAQ</a>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow w-full">
        
        {/* ESTIMATOR SECTION */}
        <section id="savings-estimator" className="max-w-6xl mx-auto p-6 mt-6 pt-12">
          <div className="mb-10 text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Unlock Your Roof's Potential
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">
              Pinpoint your roof on the satellite map to generate a real-time, NREL-backed solar energy forecast.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 mb-6 max-w-3xl mx-auto">
            <input 
              type="text" 
              className="w-full bg-slate-900/80 border border-slate-700 p-4 rounded-xl text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none" 
              placeholder="Search address, city, or pincode..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="bg-amber-500 text-slate-900 px-8 py-4 rounded-xl font-bold hover:bg-amber-400 transition w-full md:w-auto">
              Locate
            </button>
          </div>

          <div className="mb-10 rounded-2xl overflow-hidden ring-1 ring-slate-800 shadow-2xl h-[450px]">
            <MapCanvas onConfirmArea={handleConfirmArea} center={mapCenter} />
          </div>

          {isCalculating && (
            <div className="text-center p-12 animate-pulse">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
              <p className="text-amber-400 font-medium">Analyzing NREL Meteorological Data...</p>
            </div>
          )}

          {/* RESULTS DASHBOARD */}
          {calculationResult && !isCalculating && (
            <div className="space-y-8 animate-fade-in-up pb-12">
              
              <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                 <div>
                   <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Usable Sunlight</p>
                   <p className="text-4xl font-black text-amber-400">~2,800 <span className="text-xl font-normal text-slate-500">hrs/yr</span></p>
                 </div>
                 <div className="md:border-l md:border-r border-slate-800">
                   <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Available Area</p>
                   <p className="text-4xl font-black text-cyan-400">{calculationResult?.area_sq_meters?.toLocaleString()} <span className="text-xl font-normal text-slate-500">m²</span></p>
                 </div>
                 <div>
                   <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Max Capacity</p>
                   <p className="text-4xl font-black text-white">{calculationResult?.system_capacity_kw} <span className="text-xl font-normal text-slate-500">kW</span></p>
                 </div>
              </div>

              {/* CRASH FIX: Added optional chaining (?.) so undefined data doesn't break React */}
              <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center md:text-left">Your Potential Environmental Impact</h3>
                <div className="flex flex-col md:flex-row justify-around items-center gap-8 md:gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-400">{calculationResult?.environment?.co2_tons || "0"}</p>
                    <p className="text-slate-500 text-sm mt-1">Metric tons of CO2 saved</p>
                  </div>
                  <div className="text-slate-700 text-2xl font-bold hidden md:block">=</div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-400">{calculationResult?.environment?.cars || "0"}</p>
                    <p className="text-slate-500 text-sm mt-1">Cars off the road for 1 yr</p>
                  </div>
                  <div className="text-slate-700 text-2xl font-bold hidden md:block">=</div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-400">{calculationResult?.environment?.trees?.toLocaleString() || "0"}</p>
                    <p className="text-slate-500 text-sm mt-1">Tree seedlings grown (10 yrs)</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="flex border-b border-slate-800">
                  <button onClick={() => setFinanceTab("buy")} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider ${financeTab === "buy" ? "text-amber-400 border-b-2 border-amber-400 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"}`}>Buy Outright</button>
                  <button onClick={() => setFinanceTab("loan")} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider ${financeTab === "loan" ? "text-amber-400 border-b-2 border-amber-400 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"}`}>Take a Loan</button>
                </div>
                
                <div className="p-8">
                  {financeTab === "buy" ? (
                    <div className="space-y-6 max-w-2xl mx-auto">
                      <p className="text-slate-300 text-center mb-8">Pay up front, largest lifetime savings. You own the system outright and claim the PM Surya Ghar Subsidy directly.</p>
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="text-slate-400">Gross Installation Cost</span>
                        <span className="text-xl font-bold">₹{calculationResult?.financials?.gross_cost?.toLocaleString() || "0"}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="text-emerald-400">PM Surya Ghar Subsidy</span>
                        <span className="text-xl font-bold text-emerald-400">- ₹{calculationResult?.financials?.subsidy?.toLocaleString() || "0"}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-white font-bold text-lg">Net Upfront Cost</span>
                        <span className="text-3xl font-black text-amber-400">₹{calculationResult?.financials?.net_cost?.toLocaleString() || "0"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 max-w-2xl mx-auto">
                      <p className="text-slate-300 text-center mb-8">Own your system, pay over time. A loan allows you to install solar with minimal cash upfront while still claiming government subsidies.</p>
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="text-slate-400">Estimated Monthly EMI (5 yrs @ 9%)</span>
                        <span className="text-xl font-bold">₹{calculationResult?.financials?.net_cost ? Math.round((calculationResult.financials.net_cost * 1.25) / 60).toLocaleString() : "0"} / month</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="text-slate-400">Down Payment Required</span>
                        <span className="text-xl font-bold">₹0</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center py-12 border-t border-slate-800 mt-12">
                <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
                <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                  Find a registered vendor in your area to get more information, arrange a site inspection, and begin discussing installation through the national portal.
                </p>
                <a 
                  href="https://www.pmsuryaghar.gov.in/vendorInfo/empaneled_vendors" 
                  target="_blank" 
                  className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl transition shadow-lg shadow-blue-600/20 mb-6"
                >
                  Search for Solar Providers
                </a>
              </div>
            </div>
          )}
        </section>

        {/* NEW: SOLAR 101 SECTION */}
        <section id="solar-101" className="bg-slate-900 border-t border-slate-800 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How SolarSence Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-800/50 p-8 rounded-2xl text-center border border-slate-700/50">
                <div className="text-5xl mb-4">🛰️</div>
                <h3 className="text-xl font-bold text-white mb-3">1. Satellite Mapping</h3>
                <p className="text-slate-400 text-sm leading-relaxed">We use high-resolution satellite imagery to let you pinpoint the exact usable dimensions of your roof space.</p>
              </div>
              <div className="bg-slate-800/50 p-8 rounded-2xl text-center border border-slate-700/50">
                <div className="text-5xl mb-4">☁️</div>
                <h3 className="text-xl font-bold text-white mb-3">2. NREL Weather Data</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Our engine connects to the National Renewable Energy Lab to analyze decades of sun and cloud patterns for your GPS coordinates.</p>
              </div>
              <div className="bg-slate-800/50 p-8 rounded-2xl text-center border border-slate-700/50">
                <div className="text-5xl mb-4">💰</div>
                <h3 className="text-xl font-bold text-white mb-3">3. Indian Subsidies</h3>
                <p className="text-slate-400 text-sm leading-relaxed">We calculate the exact system size you need and automatically apply the PM Surya Ghar Muft Bijli Yojana logic to your estimate.</p>
              </div>
            </div>
          </div>
        </section>

        {/* NEW: FAQ SECTION */}
        <section id="faq" className="py-20 max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h4 className="text-lg font-bold text-amber-400 mb-2">How accurate is the NREL data?</h4>
              <p className="text-slate-400">The NREL PVWatts API uses decades of historical meteorological data. While highly accurate, actual production may vary based on local shading (trees/buildings) not visible on the map.</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h4 className="text-lg font-bold text-amber-400 mb-2">What is the PM Surya Ghar Subsidy?</h4>
              <p className="text-slate-400">It is a Government of India initiative offering substantial upfront financial subsidies (up to ₹78,000) for residential rooftop solar installations to promote renewable energy.</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h4 className="text-lg font-bold text-amber-400 mb-2">Do I really need to map the roof myself?</h4>
              <p className="text-slate-400">Yes! Automated AI often misjudges usable space due to AC units or water tanks. Clicking the clean boundaries of your roof ensures the most accurate capacity calculation.</p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 pt-12 pb-8 mt-auto">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-sm">
          <div>
            <h4 className="text-white font-bold mb-4 text-lg">☀️ SolarSence</h4>
            <p className="text-slate-400 leading-relaxed">
              Empowering India's transition to renewable energy through intelligent, data-driven rooftop solar estimates.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Academic Project</h4>
            <p className="text-slate-400 mb-1"><strong>Silver Oak University</strong></p>
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">Project Based Learning (PBL)</p>
            <p className="text-slate-400 mb-2">Built by:</p>
            <ul className="text-slate-500 space-y-1">
              <li>Thakor Hard J. (2401031030023)</li>
              <li>Jaiminsinh Parmar (2401031030021)</li>
              <li>Aaditya Arya (2401031030029)</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Connect</h4>
            <p className="text-slate-400 mb-4">Contact: <a href="mailto:2401031030023@silveroakuni.ac.in" className="text-amber-400 hover:underline">2401031030023@silveroakuni.ac.in</a></p>
            <div className="flex gap-4">
              <a href="https://github.com/Hard210207" target="_blank" className="text-slate-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              </a>
              <a href="https://www.linkedin.com/in/hard-thakor" target="_blank" className="text-slate-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs">
          <p>&copy; 2026 SolarSence. All rights reserved.</p>
          <button onClick={scrollToTop} className="mt-4 md:mt-0 flex items-center gap-2 hover:text-white transition">
            Back to top <span className="text-lg">↑</span>
          </button>
        </div>
      </footer>

    </div>
  );
}