import React, { useState } from 'react';
import { Navigation, X, MapPin, Play, Activity, ChevronUp, Zap, Route, Mountain, Loader2, ArrowRight, Clock, GitCommit, Save, MoveDiagonal, Ghost, Wind } from 'lucide-react';

export default function PlaceCard({ place, routeOptions, onDirectionsClick, onStartNavigation, onSaveRoute, onClose }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    setIsStarting(true);
    setTimeout(() => {
      onStartNavigation();
      setIsStarting(false);
    }, 500);
  };

  // Helper to map technical tags to App Vibe
  const getRouteStyle = (tag) => {
    switch (tag) {
      case 'Fastest': return { name: 'BLITZ', icon: <Zap size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/50' };
      case 'Shortest': return { name: 'VECTOR', icon: <MoveDiagonal size={20} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/50' }; 
      case 'Twisty': case 'Fun': return { name: 'DRIFT', icon: <Wind size={20} />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/50' }; 
      case 'Straightest': return { name: 'CRUISE', icon: <ArrowRight size={20} />, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/50' };
      default: return { name: 'GHOST', icon: <Ghost size={20} />, color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700' }; 
    }
  };
  
  // --- 1. ROUTE PREVIEW MODE ---
  if (routeOptions && routeOptions.options) {
    const selectedRoute = routeOptions.options.find(r => r.id === routeOptions.selectedId) || routeOptions.options[0];
    const selectedStyle = getRouteStyle(selectedRoute.tag);

    return (
      <div className={`absolute bottom-36 left-4 right-4 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl z-[60] transition-all duration-300 ease-in-out rounded-3xl ${isExpanded ? 'h-auto' : 'h-auto'}`}>
        
        {/* Toggle / Drag Handle */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="w-full flex justify-center pt-3 pb-2 cursor-pointer hover:bg-white/5 rounded-t-3xl transition-colors group"
        >
          <div className="w-12 h-1.5 bg-zinc-700 rounded-full group-hover:bg-zinc-600"></div>
        </button>

        {/* EXPANDED LIST */}
        {isExpanded && (
          <div className="px-5 mb-4 space-y-2 animate-in slide-in-from-bottom-5">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Select Profile</p>
            <div className="max-h-[30vh] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {routeOptions.options.map((opt) => {
                    const style = getRouteStyle(opt.tag);
                    const isSelected = routeOptions.selectedId === opt.id;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => { routeOptions.onSelect(opt.id); setIsExpanded(false); }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                            isSelected 
                                ? `bg-zinc-800 ${style.border}` 
                                : 'bg-transparent border-zinc-800 hover:bg-zinc-800'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${style.bg} ${style.color}`}>{style.icon}</div>
                                <div className="text-left">
                                    <div className="font-bold text-white text-sm">{style.name}</div>
                                    <div className="text-[10px] text-zinc-400">{opt.stats.km} km</div>
                                </div>
                            </div>
                            <div className="text-lg font-black text-white">{opt.stats.mins}<span className="text-[10px] font-normal text-zinc-500 ml-1">min</span></div>
                        </button>
                    );
                })}
            </div>
          </div>
        )}

        {/* COLLAPSED SUMMARY (The Cockpit) */}
        {!isExpanded && (
            <div className="px-6 pb-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6 cursor-pointer group" onClick={() => setIsExpanded(true)}>
                    {/* Time */}
                    <div className="flex flex-col justify-center">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={10} /> ETA</div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-3xl font-black text-white tracking-tighter tabular-nums">{selectedRoute.stats.mins}</span>
                           <span className="text-xs font-bold text-zinc-600">min</span>
                        </div>
                    </div>
                    {/* Distance */}
                    <div className="flex flex-col justify-center pl-4 border-l border-zinc-800">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1"><GitCommit size={10} /> Dist</div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-2xl font-bold text-white tracking-tight tabular-nums">{selectedRoute.stats.km}</span>
                           <span className="text-xs font-bold text-zinc-600">km</span>
                        </div>
                    </div>
                    {/* Vibe */}
                    <div className="flex flex-col justify-center items-end pl-4 border-l border-zinc-800">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1 group-hover:text-white transition-colors">Mode <ChevronUp size={10} /></div>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${selectedStyle.bg} ${selectedStyle.color} border-transparent`}>
                            {selectedStyle.icon}
                            <span className="text-[10px] font-black uppercase">{selectedStyle.name}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 items-center">
                    <button onClick={onClose} className="p-3.5 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all"><X size={20} /></button>
                    
                    {/* Save Route Button */}
                    <button 
                        onClick={() => onSaveRoute && onSaveRoute(selectedRoute)}
                        className="p-3.5 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all flex items-center justify-center"
                        title="Save Route"
                    >
                        <Save size={20} />
                    </button>

                    <button 
                      onClick={handleStart} 
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 group relative overflow-hidden"
                    >
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                       {isStarting ? <Loader2 className="animate-spin" /> : <><span className="font-bold uppercase tracking-wide text-sm">Start Ride</span><Play size={18} fill="currentColor" /></>}
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
      <div className="absolute bottom-36 left-4 right-4 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 p-5 rounded-3xl shadow-2xl z-50 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-4">
            <div className="bg-zinc-800 p-3 rounded-2xl h-14 w-14 flex items-center justify-center shrink-0 border border-zinc-700">
              <MapPin className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight pr-4 line-clamp-2">{place.name}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 border border-zinc-700">GPS</div>
                <p className="text-zinc-400 text-xs font-mono">{place.coords[1].toFixed(4)}, {place.coords[0].toFixed(4)}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-all"><X size={20} /></button>
        </div>
        <div className="flex gap-3">
          <button onClick={onDirectionsClick} className="flex-1 bg-zinc-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all border border-zinc-700 active:scale-95"><Navigation size={18} /> Directions</button>
          <button onClick={handleStart} className="flex-1 bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-lg shadow-white/5 active:scale-95">
            {isStarting ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
            {isStarting ? 'Starting...' : 'Start'}
          </button>
        </div>
      </div>
    );
  }
  return null;
}