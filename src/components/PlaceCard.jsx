import React, { useState } from 'react';
import { Navigation, X, MapPin, Play, Activity, ChevronUp, Zap, Route, Mountain, Loader2, ArrowRight, Clock, GitCommit } from 'lucide-react';

export default function PlaceCard({ place, routeOptions, onDirectionsClick, onStartNavigation, onClose }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    setIsStarting(true);
    setTimeout(() => {
      onStartNavigation();
      setIsStarting(false);
    }, 500);
  };
  
  // --- 1. ROUTE PREVIEW MODE (The "Start Navigation" Screen) ---
  if (routeOptions && routeOptions.options) {
    const selectedRoute = routeOptions.options.find(r => r.id === routeOptions.selectedId) || routeOptions.options[0];

    return (
      <div className={`absolute bottom-0 left-0 w-full bg-zinc-950 border-t border-zinc-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-[60] transition-all duration-300 ease-in-out rounded-t-3xl ${isExpanded ? 'pb-8' : 'pb-24'}`}>
        
        {/* Drag Handle */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="w-full flex justify-center pt-3 pb-2 cursor-pointer hover:bg-zinc-900 rounded-t-3xl active:bg-zinc-800 transition-colors group"
        >
          <div className="w-12 h-1.5 bg-zinc-800 rounded-full group-hover:bg-zinc-700 transition-colors"></div>
        </button>

        {/* --- EXPANDED LIST (Route Selector) --- */}
        {isExpanded && (
          <div className="px-6 mb-6 space-y-3 animate-in slide-in-from-bottom-5 fade-in">
            <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Route Profile</p>
                <span className="text-xs font-mono text-zinc-600 bg-zinc-900 px-2 py-1 rounded">{routeOptions.options.length} FOUND</span>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {routeOptions.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { 
                      routeOptions.onSelect(opt.id); 
                      setIsExpanded(false); 
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                    routeOptions.selectedId === opt.id 
                      ? 'bg-zinc-900 border-emerald-500/50 shadow-lg shadow-emerald-900/10' 
                      : 'bg-black/20 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                      {/* Icon Box */}
                      <div className={`p-3 rounded-xl ${
                          (opt.tag === 'Fun' || opt.tag === 'Twisty') ? 'bg-purple-500/10 text-purple-400' :
                          opt.tag === 'Fastest' ? 'bg-emerald-500/10 text-emerald-400' :
                          opt.tag === 'Straightest' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-zinc-800 text-zinc-400'
                      }`}>
                          {(opt.tag === 'Fun' || opt.tag === 'Twisty') ? <Mountain size={20} /> :
                           opt.tag === 'Fastest' ? <Zap size={20} /> : 
                           opt.tag === 'Straightest' ? <ArrowRight size={20} /> : <Route size={20} />}
                      </div>
                      <div className="text-left">
                          <div className="font-bold text-white text-base">{opt.tag || 'Alternative'}</div>
                          <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                              <span>{opt.stats.vibe}</span>
                              <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                              <span>{opt.stats.km} km</span>
                          </div>
                      </div>
                  </div>
                  
                  <div className="text-right">
                      <div className="text-xl font-black text-white tracking-tight tabular-nums">
                          {opt.stats.mins}<span className="text-xs font-bold text-zinc-600 ml-1">min</span>
                      </div>
                      {routeOptions.selectedId === opt.id && (
                          <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Active</div>
                      )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- COLLAPSED SUMMARY (The Cockpit) --- */}
        {!isExpanded && (
            <div className="px-6">
                {/* Route Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6 cursor-pointer" onClick={() => setIsExpanded(true)}>
                    
                    {/* Time */}
                    <div className="flex flex-col justify-center">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Clock size={12} /> Duration
                        </div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-3xl font-black text-white tracking-tighter tabular-nums">{selectedRoute.stats.mins}</span>
                           <span className="text-sm font-bold text-zinc-600">min</span>
                        </div>
                    </div>

                    {/* Distance */}
                    <div className="flex flex-col justify-center pl-4 border-l border-zinc-800">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                           <GitCommit size={12} /> Distance
                        </div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-2xl font-bold text-white tracking-tight tabular-nums">{selectedRoute.stats.km}</span>
                           <span className="text-xs font-bold text-zinc-600">km</span>
                        </div>
                    </div>

                    {/* Vibe / Twistiness */}
                    <div className="flex flex-col justify-center items-end pl-4 border-l border-zinc-800">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                           Vibe
                        </div>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                            (selectedRoute.tag === 'Fun' || selectedRoute.tag === 'Twisty') ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' : 
                            selectedRoute.tag === 'Fastest' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 
                            'border-zinc-700 bg-zinc-800 text-zinc-400'
                        }`}>
                            <Activity size={14} />
                            <span className="text-xs font-bold uppercase">{selectedRoute.stats.vibe}</span>
                        </div>
                    </div>
                </div>

                {/* Primary Action Bar */}
                <div className="flex gap-3 items-center">
                    <button 
                      onClick={onClose} 
                      className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all active:scale-95"
                    >
                      <X size={24} />
                    </button>
                    
                    <button 
                      onClick={handleStart} 
                      className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-900/30 group overflow-hidden relative"
                    >
                       {/* Shine Effect */}
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                       
                       {isStarting ? (
                         <Loader2 className="animate-spin" />
                       ) : (
                         <>
                           <span className="font-black text-lg uppercase tracking-wide">Start Ride</span>
                           <Play size={20} fill="currentColor" className="group-hover:translate-x-1 transition-transform" />
                         </>
                       )}
                    </button>
                </div>
            </div>
        )}
      </div>
    );
  }

  // --- 2. PLACE DETAILS MODE ---
  if (place) {
    return (
      <div className="absolute bottom-24 left-4 right-4 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 p-5 rounded-3xl shadow-2xl z-50 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-4">
            <div className="bg-zinc-800 p-3 rounded-2xl h-14 w-14 flex items-center justify-center shrink-0 border border-zinc-700">
              <MapPin className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight pr-4 line-clamp-2">{place.name}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 border border-zinc-700">
                   GPS
                </div>
                <p className="text-zinc-400 text-xs font-mono">
                  {place.coords[1].toFixed(4)}, {place.coords[0].toFixed(4)}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 -mt-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onDirectionsClick} 
            className="flex-1 bg-zinc-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all border border-zinc-700 active:scale-95"
          >
            <Navigation size={18} />
            Directions
          </button>
          <button 
            onClick={handleStart} 
            className="flex-1 bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-lg shadow-white/5 active:scale-95"
          >
            {isStarting ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
            {isStarting ? 'Starting...' : 'Start'}
          </button>
        </div>
      </div>
    );
  }
  return null;
}