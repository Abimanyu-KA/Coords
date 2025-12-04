import React, { useState } from 'react';
import { Navigation, X, MapPin, Play, Activity, ChevronUp, Zap, Route, Mountain, Loader2, ArrowRight } from 'lucide-react';

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
  
  // 1. ROUTE PREVIEW MODE (Multi-Option)
  if (routeOptions && routeOptions.options) {
    const selectedRoute = routeOptions.options.find(r => r.id === routeOptions.selectedId) || routeOptions.options[0];

    return (
      <div className={`absolute bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-800 shadow-2xl z-[60] transition-all duration-300 ease-in-out rounded-t-3xl ${isExpanded ? 'pb-8' : 'pb-32'}`}>
        
        {/* HEADER / TOGGLE */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="w-full flex justify-center pt-3 pb-2 cursor-pointer hover:bg-zinc-800/50 rounded-t-3xl active:bg-zinc-800 transition-colors"
        >
          <div className="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
        </button>

        {/* EXPANDED LIST (Only when open) */}
        {isExpanded && (
          <div className="px-6 mb-4 space-y-3 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Route Type</p>
                <span className="text-xs text-zinc-600">{routeOptions.options.length} options found</span>
            </div>

            {routeOptions.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { 
                    routeOptions.onSelect(opt.id); 
                    setIsExpanded(false); // Close after choosing
                }}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  routeOptions.selectedId === opt.id 
                    ? 'bg-zinc-800 border-purple-500/50 shadow-lg shadow-purple-900/20' 
                    : 'bg-transparent border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-4">
                    {/* Dynamic Icon Box */}
                    <div className={`p-3 rounded-full ${
                        (opt.tag === 'Fun' || opt.tag === 'Twisty') ? 'bg-purple-500/20 text-purple-400' :
                        opt.tag === 'Fastest' ? 'bg-green-500/20 text-green-400' :
                        opt.tag === 'Straightest' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-zinc-700/50 text-zinc-400'
                    }`}>
                        {(opt.tag === 'Fun' || opt.tag === 'Twisty') ? <Mountain size={20} /> :
                         opt.tag === 'Fastest' ? <Zap size={20} /> : 
                         opt.tag === 'Straightest' ? <ArrowRight size={20} /> : <Route size={20} />}
                    </div>
                    
                    {/* Text Details */}
                    <div className="text-left">
                        <div className="font-bold text-white text-lg">{opt.tag || 'Alternative'}</div>
                        <div className="text-xs text-zinc-400 flex items-center gap-2">
                            <span>{opt.stats.km} km</span>
                            <span className="w-1 h-1 bg-zinc-600 rounded-full"></span>
                            <span className={`${
                                opt.stats.vibe === 'Twisty' ? 'text-purple-400' : 'text-zinc-400'
                            }`}>{opt.stats.vibe}</span>
                        </div>
                    </div>
                </div>

                {/* Time & Active Indicator */}
                <div className="text-right">
                    <div className="text-2xl font-black text-white tracking-tighter">
                        {opt.stats.mins}<span className="text-sm font-medium text-zinc-500 ml-1">min</span>
                    </div>
                    {routeOptions.selectedId === opt.id && (
                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mt-1">Selected</div>
                    )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* COLLAPSED SUMMARY (Preview Mode) */}
        {!isExpanded && (
            <div className="px-6 mb-6">
                <div className="flex justify-between items-end mb-6 cursor-pointer group" onClick={() => setIsExpanded(true)}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${
                                (selectedRoute.tag === 'Fun' || selectedRoute.tag === 'Twisty') ? 'border-purple-500 text-purple-400' : 
                                selectedRoute.tag === 'Fastest' ? 'border-green-500 text-green-400' : 
                                'border-zinc-600 text-zinc-400'
                            }`}>
                                {selectedRoute.tag || 'Standard'}
                            </span>
                            <ChevronUp size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white tracking-tighter">{selectedRoute.stats.mins}</span>
                            <span className="text-zinc-500 font-bold">min</span>
                        </div>
                        <div className="text-zinc-400 text-sm font-medium mt-1 flex gap-3">
                            <span>{selectedRoute.stats.km} km</span>
                            <span className="text-zinc-600">•</span>
                            <span>{selectedRoute.stats.vibe} ({selectedRoute.stats.sinuosity})</span>
                        </div>
                    </div>
                    
                    {/* Sinuosity Score Badge */}
                    <div className={`px-3 py-2 rounded-xl border flex flex-col items-center ${
                        selectedRoute.stats.sinuosity > 1.2 ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                    }`}>
                        <Activity size={18} />
                        <span className="text-xs font-black mt-1">{selectedRoute.stats.sinuosity}</span>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button onClick={onClose} className="p-4 bg-zinc-800 rounded-2xl text-zinc-400 hover:text-white active:scale-95 transition-all"><X size={24} /></button>
                    <button onClick={handleStart} className="flex-1 bg-green-600 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-green-500 active:scale-95 transition-all shadow-lg shadow-green-900/20">
                        {isStarting ? <Loader2 className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                        {isStarting ? 'Starting...' : 'Start Navigation'}
                    </button>
                </div>
            </div>
        )}
      </div>
    );
  }

  // 2. PLACE DETAILS MODE
  if (place) {
    return (
      <div className="absolute bottom-36 left-4 right-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-start mb-5">
          <div className="flex gap-4">
            <div className="bg-zinc-800 p-3 rounded-full h-12 w-12 flex items-center justify-center shrink-0">
              <MapPin className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight pr-4">{place.name}</h2>
              <p className="text-zinc-400 text-sm mt-1">{place.coords[1].toFixed(4)}, {place.coords[0].toFixed(4)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex gap-3">
          <button onClick={onDirectionsClick} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all border border-zinc-700">
            <Navigation size={18} /> Directions
          </button>
          <button onClick={handleStart} className="flex-1 bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all">
            {isStarting ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
            {isStarting ? 'Starting...' : 'Start'}
          </button>
        </div>
      </div>
    );
  }
  return null;
}