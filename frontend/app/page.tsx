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
  
  // USER INPUTS FOR INTERACTIVE SLIDERS
  const [monthlyUnits, setMonthlyUnits] = useState(250);
  const [selectedCapacity, setSelectedCapacity] = useState(1); 

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
      // NOTE: Ensure this URL points to your live Render backend!
      const response = await fetch("https://solar-vision-backend.onrender.com/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: points }),
      });
      const result = await response.json();
      if (result.status === "success") {
        setCalculationResult(result);
        // Default the capacity slider to their physical max roof limit
        setSelectedCapacity(result.system_capacity_kw);
      }
    } catch (error) {
      console.error("Backend connection failed");
    } finally {
      setIsCalculating(false);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // FRONTEND MATH: Calculates cost and subsidy instantly as user drags the slider
  const calculateFinancials = (kw: number) => {
    const costPerKw = 55000; // Estimated average cost per kW in India
    const grossCost = kw * costPerKw;
    
    let subsidy = 0;
    if (kw <= 2) subsidy = kw * 30000;
    else if (kw <= 3) subsidy = 60000 + ((kw - 2) * 18000);
    else subsidy = 78000; // Capped for systems larger than 3kW

    return {
      gross: Math.round(grossCost),
      subsidy: Math.round(subsidy),
      net: Math.round(grossCost - subsidy)
    };
  };

  const currentFinancials = calculateFinancials(selectedCapacity);

  // PM SURYA GHAR LOGIC: Translates electricity bill to recommended kW
  const getRecommendedCapacity = (units: number) => {
    if (units <= 150) return "1 - 2 kW";
    if (units <= 300) return "2 - 3 kW";
    return "Above 3 kW";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 flex flex-col scroll-smooth">
      
      {/* HEADER */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-[9999]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☀️</span>
            <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
              SolarSence
            </span>
          </div>
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
              
              {/* TOP STATS */}
              <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                 <div>
                   <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Usable Area</p>
                   <p className="text-4xl font-black text-cyan-400">{calculationResult?.area_sq_meters?.toLocaleString()} <span className="text-xl font-normal text-slate-500">m²</span></p>
                 </div>
                 <div className="md:border-l md:border-r border-slate-800">
                   <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Max Roof Capacity</p>
                   <p className="text-4xl font-black text-white">{calculationResult?.system_capacity_kw} <span className="text-xl font-normal text-slate-500">kW</span></p>
                 </div>
                 <div>
                   <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Max Annual Yield</p>
                   <p className="text-4xl font-black text-amber-400">{calculationResult?.annual_energy_kwh?.toLocaleString()} <span className="text-xl font-normal text-slate-500">kWh</span></p>
                 </div>
              </div>

              {/* INTERACTIVE FINE-TUNING SECTION */}
              <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 space-y-10">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">Fine-Tune Your Installation</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Slider 1: Electricity Bill */}
                  <div className="space-y-4">
                    <label className="block text-slate-300 font-medium">
                      Average Monthly Electricity: <span className="text-amber-400 font-bold text-xl ml-2">{monthlyUnits} <span className="text-sm">Units</span></span>
                    </label>
                    <input 
                      type="range" 
                      min="50" 
                      max="1000" 
                      step="10" 
                      value={monthlyUnits} 
                      onChange={(e) => setMonthlyUnits(Number(e.target.value))} 
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" 
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                      <span>50 units</span>
                      <span>500+ units</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                      PM Surya Ghar Recommended System: <strong className="text-emerald-400">{getRecommendedCapacity(monthlyUnits)}</strong>
                    </p>
                  </div>

                  {/* Slider 2: System Size Selection */}
                  <div className="space-y-4">
                    <label className="block text-slate-300 font-medium">
                      Desired Installation Size: <span className="text-cyan-400 font-bold text-xl ml-2">{selectedCapacity} <span className="text-sm">kW</span></span>
                    </label>
                    <input 
                        type="range" 
                        min="1" 
                        max={calculationResult?.system_capacity_kw || 10} 
                        step="0.5" 
                        value={selectedCapacity} 
                        onChange={(e) => setSelectedCapacity(Number(e.target.value))} 
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                      <span>1 kW</span>
                      <span>{calculationResult?.system_capacity_kw} kW (Max)</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-4 italic">
                      This is capped at your maximum usable roof area limit.
                    </p>
                  </div>
                </div>
              </div>

              {/* FINANCIAL DASHBOARD */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="flex border-b border-slate-800 bg-slate-800/20">
                  <button onClick={() => setFinanceTab("buy")} className={`flex-1 py-5 text-sm font-bold uppercase tracking-wider transition ${financeTab === "buy" ? "text-amber-400 border-b-2 border-amber-400 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"}`}>Buy Outright</button>
                  <button onClick={() => setFinanceTab("loan")} className={`flex-1 py-5 text-sm font-bold uppercase tracking-wider transition ${financeTab === "loan" ? "text-amber-400 border-b-2 border-amber-400 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"}`}>Take a Loan</button>
                </div>
                
                <div className="p-8 md:p-12">
                  {financeTab === "buy" ? (
                    <div className="space-y-6 max-w-2xl mx-auto">
                      <p className="text-slate-300 text-center mb-10 leading-relaxed">Pay up front for the largest lifetime savings. You own the system outright and claim the PM Surya Ghar Subsidy directly for your <strong className="text-white">{selectedCapacity} kW</strong> system.</p>
                      
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="text-slate-400 text-lg">Gross Installation Cost</span>
                        <span className="text-xl font-bold">₹{currentFinancials.gross.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="text-emerald-400 text-lg">PM Surya Ghar Subsidy</span>
                        <span className="text-xl font-bold text-emerald-400">- ₹{currentFinancials.subsidy.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <span className="text-white font-bold text-xl">Your Net Upfront Cost</span>
                        <span className="text-4xl md:text-5xl font-black text-amber-400">₹{currentFinancials.net.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 max-w-2xl mx-auto">
                      <p className="text-slate-300 text-center mb-10 leading-relaxed">Own your system and pay over time. A loan allows you to install your <strong className="text-white">{selectedCapacity} kW</strong> solar plant with minimal cash upfront while still claiming government subsidies.</p>
                      
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="text-slate-400 text-lg">Estimated Monthly EMI (5 yrs @ 9%)</span>
                        <span className="text-2xl font-bold text-amber-400">₹{Math.round((currentFinancials.net * 1.25) / 60).toLocaleString()} <span className="text-lg font-normal text-slate-500">/ month</span></span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="text-slate-400 text-lg">Down Payment Required</span>
                        <span className="text-2xl font-bold text-white">₹0</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ENVIRONMENTAL IMPACT */}
              <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8 text-center">Your Potential Environmental Impact</h3>
                <div className="flex flex-col md:flex-row justify-around items-center gap-8 md:gap-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-emerald-400">{calculationResult?.environment?.co2_tons || "0"}</p>
                    <p className="text-slate-500 text-sm mt-2">Metric tons of CO2 saved</p>
                  </div>
                  <div className="text-slate-700 text-3xl font-bold hidden md:block">=</div>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-emerald-400">{calculationResult?.environment?.cars || "0"}</p>
                    <p className="text-slate-500 text-sm mt-2">Cars off the road for 1 yr</p>
                  </div>
                  <div className="text-slate-700 text-3xl font-bold hidden md:block">=</div>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-emerald-400">{calculationResult?.environment?.trees?.toLocaleString() || "0"}</p>
                    <p className="text-slate-500 text-sm mt-2">Tree seedlings grown (10 yrs)</p>
                  </div>
                </div>
              </div>

              {/* PROVIDER SEARCH */}
              <div className="text-center py-16 border-t border-slate-800 mt-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to get started?</h2>
                <p className="text-slate-400 max-w-2xl mx-auto mb-10 text-lg">
                  Find a registered vendor in your area to get more information, arrange a site inspection, and begin discussing your {selectedCapacity} kW installation through the national portal.
                </p>
                <a 
                  href="https://www.pmsuryaghar.gov.in/vendorInfo/empaneled_vendors" 
                  target="_blank" 
                  className="inline-block bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-10 rounded-xl transition shadow-xl shadow-blue-600/20 mb-8 transform hover:-translate-y-1"
                >
                  Search for Local Solar Providers
                </a>
              </div>

            </div>
          )}
        </section>

        {/* SOLAR 101 SECTION */}
        <section id="solar-101" className="bg-slate-900 border-t border-slate-800 py-24">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-5xl font-extrabold text-center mb-16 tracking-tight">How SolarSence Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-800/30 p-10 rounded-3xl text-center border border-slate-700/50 hover:bg-slate-800/50 transition">
                <div className="text-6xl mb-6">🛰️</div>
                <h3 className="text-2xl font-bold text-white mb-4">1. Satellite Mapping</h3>
                <p className="text-slate-400 leading-relaxed">We use high-resolution satellite imagery to let you pinpoint the exact usable dimensions of your roof space.</p>
              </div>
              <div className="bg-slate-800/30 p-10 rounded-3xl text-center border border-slate-700/50 hover:bg-slate-800/50 transition">
                <div className="text-6xl mb-6">☁️</div>
                <h3 className="text-2xl font-bold text-white mb-4">2. NREL Weather Data</h3>
                <p className="text-slate-400 leading-relaxed">Our engine connects to the National Renewable Energy Lab to analyze decades of sun and cloud patterns for your precise GPS coordinates.</p>
              </div>
              <div className="bg-slate-800/30 p-10 rounded-3xl text-center border border-slate-700/50 hover:bg-slate-800/50 transition">
                <div className="text-6xl mb-6">💰</div>
                <h3 className="text-2xl font-bold text-white mb-4">3. Indian Subsidies</h3>
                <p className="text-slate-400 leading-relaxed">We calculate the exact system size you need and automatically apply the official PM Surya Ghar Muft Bijli Yojana logic to your estimate.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-24 max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-extrabold text-center mb-16 tracking-tight">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition">
              <h4 className="text-xl font-bold text-amber-400 mb-3">How accurate is the NREL data?</h4>
              <p className="text-slate-400 leading-relaxed">The NREL PVWatts API uses decades of historical meteorological data. While highly accurate for overall sunlight hours, actual production may vary based on local shading (trees or nearby buildings) not visible on the top-down map.</p>
            </div>
            <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition">
              <h4 className="text-xl font-bold text-amber-400 mb-3">What is the PM Surya Ghar Subsidy?</h4>
              <p className="text-slate-400 leading-relaxed">It is a Government of India initiative offering substantial upfront financial subsidies (up to ₹78,000) for residential rooftop solar installations to promote renewable energy and reduce household electricity bills.</p>
            </div>
            <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition">
              <h4 className="text-xl font-bold text-amber-400 mb-3">Do I really need to map the roof myself?</h4>
              <p className="text-slate-400 leading-relaxed">Yes! Fully automated AI often misjudges usable space due to small obstacles like AC units, skylights, or water tanks. Manually clicking the clean boundaries of your roof ensures the most accurate capacity calculation.</p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8 mt-auto">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 text-sm">
          <div>
            <h4 className="text-white font-bold mb-6 text-xl flex items-center gap-2">☀️ SolarSence</h4>
            <p className="text-slate-400 leading-relaxed pr-6">
              Empowering India's transition to renewable energy through intelligent, data-driven rooftop solar estimates.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 text-lg tracking-wide uppercase">Academic Project</h4>
            <p className="text-slate-300 font-medium mb-1 text-base">Silver Oak University</p>
            <p className="text-amber-500/80 text-xs uppercase tracking-widest mb-6 font-bold">Project Based Learning (PBL)</p>
            <p className="text-slate-500 mb-3 uppercase tracking-wider text-xs font-bold">Built By</p>
            <ul className="text-slate-400 space-y-2 font-medium">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>Thakor Hard J. <span className="text-slate-600 text-xs">(2401031030023)</span></li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>Jaiminsinh Parmar <span className="text-slate-600 text-xs">(2401031030021)</span></li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>Aaditya Arya <span className="text-slate-600 text-xs">(2401031030029)</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 text-lg tracking-wide uppercase">Connect</h4>
            <p className="text-slate-400 mb-6">Contact: <br/><a href="mailto:2401031030023@silveroakuni.ac.in" className="text-amber-400 hover:text-amber-300 transition mt-1 inline-block">2401031030023@silveroakuni.ac.in</a></p>
            <div className="flex gap-5">
              <a href="https://github.com/Hard210207" target="_blank" className="text-slate-500 hover:text-white hover:-translate-y-1 transform transition bg-slate-900 p-3 rounded-full border border-slate-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              </a>
              <a href="https://www.linkedin.com/in/hard-thakor" target="_blank" className="text-slate-500 hover:text-white hover:-translate-y-1 transform transition bg-slate-900 p-3 rounded-full border border-slate-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs">
          <p>&copy; 2026 SolarSence. All rights reserved.</p>
          <button onClick={scrollToTop} className="mt-4 md:mt-0 flex items-center gap-2 hover:text-amber-400 transition bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
            Back to top <span className="text-lg leading-none">↑</span>
          </button>
        </div>
      </footer>

    </div>
  );
}