import React, { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin, Plus, Navigation, CircleDot, ArrowDown } from 'lucide-react';

// ⚠️ UPDATED: Uses the Environment Variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function SearchBox({ onLocationSelect, onRouteRequest, onClose }) {
  const [mode, setMode] = useState('single'); 
  
  const [waypoints, setWaypoints] = useState([
    { id: 1, text: '', coords: null, placeholder: 'Start Location' },
    { id: 2, text: '', coords: null, placeholder: 'Destination' }
  ]);
  
  const [singleQuery, setSingleQuery] = useState('');
  const [activeInputIndex, setActiveInputIndex] = useState(null); 
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (text, index) => {
    setActiveInputIndex(index);
    if (index === -1) {
      setSingleQuery(text);
    } else {
      const newWaypoints = [...waypoints];
      newWaypoints[index].text = text;
      newWaypoints[index].coords = null; 
      setWaypoints(newWaypoints);
    }

    if (text.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`
      );
      const data = await response.json();
      setResults(data.features || []);
    } catch (error) {
      console.error("Search error:", error);
    }
    setIsSearching(false);
  };

  const selectResult = (place) => {
    if (activeInputIndex === -1) {
      setSingleQuery(place.text);
      onLocationSelect({ name: place.text, coords: place.center });
      onClose(); 
    } else {
      const newWaypoints = [...waypoints];
      newWaypoints[activeInputIndex].text = place.text;
      newWaypoints[activeInputIndex].coords = place.center;
      setWaypoints(newWaypoints);
      setResults([]); 
    }
  };

  const addStop = () => {
    const newWaypoints = [...waypoints];
    newWaypoints.splice(newWaypoints.length - 1, 0, {
      id: Date.now(),
      text: '',
      coords: null,
      placeholder: 'Add Stop'
    });
    setWaypoints(newWaypoints);
  };

  const handleRouteGo = () => {
    const validPoints = waypoints.filter(wp => wp.coords !== null);
    if (validPoints.length < 2) {
      alert("Please select at least a Start and End location from the dropdown suggestions.");
      return;
    }
    onRouteRequest(validPoints);
    onClose();
  };

  const SuggestionsList = () => {
    if (results.length === 0) return null;

    return (
      <div className="absolute top-full left-0 w-full mt-2 bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {results.map((place) => (
          <button
            key={place.id}
            className="w-full text-left p-3 hover:bg-zinc-800 transition-colors flex items-center gap-3 border-b border-zinc-800 last:border-0 group"
            onClick={() => selectResult(place)}
          >
            <div className="bg-zinc-800 p-2 rounded-full text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-all">
              <MapPin size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-white">{place.text}</p>
              <p className="text-xs text-zinc-500 truncate">{place.place_name}</p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full sm:h-auto sm:max-w-md sm:m-4 bg-black/95 backdrop-blur-xl sm:rounded-2xl border-b sm:border border-zinc-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-top-2">
      
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-zinc-800">
        <div className="flex gap-6">
          <button 
            onClick={() => setMode('single')}
            className={`pb-2 text-sm font-bold transition-all ${mode === 'single' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Find Place
          </button>
          <button 
            onClick={() => setMode('route')}
            className={`pb-2 text-sm font-bold transition-all ${mode === 'route' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Get Directions
          </button>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-full transition-all">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {mode === 'single' && (
          <div className="relative group">
            <Search className="absolute left-3 top-3.5 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
            <input
              autoFocus
              type="text"
              placeholder="Search Chennai..."
              className="w-full bg-zinc-900/50 text-white pl-10 pr-4 py-3 rounded-xl border border-zinc-700 focus:border-blue-500 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-600"
              value={singleQuery}
              onChange={(e) => handleSearch(e.target.value, -1)}
              onFocus={() => setActiveInputIndex(-1)}
            />
            {activeInputIndex === -1 && <SuggestionsList />}
          </div>
        )}

        {mode === 'route' && (
          <div className="space-y-4">
            <div className="space-y-3 relative">
              <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-zinc-800 z-0"></div>

              {waypoints.map((wp, index) => (
                <div key={wp.id} className={`relative ${activeInputIndex === index ? 'z-20' : 'z-10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                      index === 0 ? 'border-green-500/30 bg-green-500/10 text-green-500' :
                      index === waypoints.length - 1 ? 'border-red-500/30 bg-red-500/10 text-red-500' :
                      'border-yellow-500/30 bg-yellow-500/10 text-yellow-500'
                    }`}>
                      <CircleDot size={14} fill="currentColor" className="opacity-50" />
                    </div>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder={wp.placeholder}
                        className="w-full bg-zinc-900/50 text-white px-4 py-3 rounded-xl border border-zinc-700 focus:border-blue-500 focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-600 text-sm"
                        value={wp.text}
                        onChange={(e) => handleSearch(e.target.value, index)}
                        onFocus={() => setActiveInputIndex(index)}
                      />
                      {activeInputIndex === index && <SuggestionsList />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={addStop} 
                className="flex-1 py-3 bg-zinc-900 border border-zinc-700 text-zinc-300 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-800 hover:text-white transition-all"
              >
                <Plus size={16} /> <span className="text-sm">Add Stop</span>
              </button>
              
              <button 
                onClick={handleRouteGo} 
                className="flex-1 py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                <Navigation size={16} /> <span className="text-sm">GO</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}