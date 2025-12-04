import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, Plus, CircleDot, ArrowLeft } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function SearchBox({ 
  onLocationSelect, 
  onRouteRequest, 
  onClear, 
  initialMode = 'single', 
  initialDestination = null,
  defaultInputValue = '',
  onClose 
}) {
  const [mode, setMode] = useState(initialMode); 
  
  const [waypoints, setWaypoints] = useState([
    { id: 1, text: 'Current Location', coords: null, placeholder: 'Start Location', isCurrent: true },
    { 
      id: 2, 
      text: initialDestination ? initialDestination.name : '', 
      coords: initialDestination ? initialDestination.coords : null, 
      placeholder: 'Destination' 
    }
  ]);
  
  const [singleQuery, setSingleQuery] = useState(defaultInputValue);
  const [activeInputIndex, setActiveInputIndex] = useState(null); 
  const [results, setResults] = useState([]);

  // Sync internal state with props
  useEffect(() => {
    if (defaultInputValue) setSingleQuery(defaultInputValue);
  }, [defaultInputValue]);

  useEffect(() => {
    setMode(initialMode);
    if (initialMode === 'route' && initialDestination) {
        setWaypoints(prev => {
            const newWp = [...prev];
            newWp[1].text = initialDestination.name;
            newWp[1].coords = initialDestination.coords;
            return newWp;
        });
    }
  }, [initialMode, initialDestination]);

  // ⚡ AUTO-TRIGGER ROUTE: Watch waypoints for changes
  useEffect(() => {
    if (mode === 'route') {
      const validPoints = waypoints.filter(wp => wp.coords !== null || wp.isCurrent);
      // Only auto-request if we have at least 2 valid points and the user isn't currently typing (activeInputIndex is null or suggestions closed)
      if (validPoints.length >= 2 && results.length === 0) {
        onRouteRequest(validPoints);
      }
    }
  }, [waypoints, mode, results.length]); // Dependency on results ensures we don't trigger while selecting

  const handleSearch = async (text, index) => {
    setActiveInputIndex(index);
    if (index === -1) {
      setSingleQuery(text);
    } else {
      const newWaypoints = [...waypoints];
      newWaypoints[index].text = text;
      newWaypoints[index].coords = null; 
      newWaypoints[index].isCurrent = false; 
      setWaypoints(newWaypoints);
    }

    if (text.length < 3) {
      setResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`
      );
      const data = await response.json();
      setResults(data.features || []);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const selectResult = (place) => {
    if (activeInputIndex === -1) {
      setSingleQuery(place.text);
      setResults([]); 
      onLocationSelect({ name: place.text, coords: place.center });
      // Keep bar visible
    } else {
      const newWaypoints = [...waypoints];
      newWaypoints[activeInputIndex].text = place.text;
      newWaypoints[activeInputIndex].coords = place.center;
      newWaypoints[activeInputIndex].isCurrent = false;
      setWaypoints(newWaypoints);
      setResults([]); 
      // Effect hook will handle onRouteRequest automatically
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

  const SuggestionsList = () => {
    if (results.length === 0) return null;
    return (
      <div className="absolute top-full left-0 w-full mt-2 bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl z-50 overflow-hidden max-h-[50vh] overflow-y-auto">
        {results.map((place) => (
          <button
            key={place.id}
            className="w-full text-left p-4 hover:bg-zinc-800 transition-colors flex items-center gap-3 border-b border-zinc-800 last:border-0 group"
            onClick={() => selectResult(place)}
          >
            <div className="bg-zinc-800 p-2 rounded-full text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-all shrink-0">
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
    <div className="absolute top-0 left-0 w-full h-auto sm:max-w-md sm:m-4 bg-black/95 backdrop-blur-xl sm:rounded-2xl border-b sm:border border-zinc-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-top-2">
      
      {/* Clean Header - Removed all text labels */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex gap-2 items-center">
          {mode === 'route' ? (
            <button 
              onClick={() => {
                  setMode('single');
                  onClear(); 
              }}
              className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="p-2 -ml-2 text-zinc-500">
               <Search size={20} />
            </div>
          )}
        </div>

        {/* Search Input - SINGLE MODE - Integrated into Header */}
        {mode === 'single' && (
          <div className="flex-1 relative mx-2">
            <input
              autoFocus={false} 
              type="text"
              placeholder="Search location..."
              className="w-full bg-transparent text-white px-2 py-2 font-medium text-lg outline-none placeholder:text-zinc-600"
              value={singleQuery}
              onChange={(e) => handleSearch(e.target.value, -1)}
              onFocus={() => setActiveInputIndex(-1)}
            />
            {activeInputIndex === -1 && <SuggestionsList />}
          </div>
        )}
        
        {/* Close Button */}
        <button 
            onClick={() => {
                setSingleQuery('');
                onClear();
                if(onClose) onClose();
            }}
            className="p-2 -mr-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-full transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* ROUTE MODE INPUTS */}
      {mode === 'route' && (
        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-5">
          <div className="space-y-3 relative mt-1">
            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-zinc-700 z-0"></div>
            {waypoints.map((wp, index) => (
              <div key={wp.id} className={`relative ${activeInputIndex === index ? 'z-20' : 'z-10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 bg-black z-10 ${
                    index === 0 ? 'border-green-500 text-green-500' :
                    index === waypoints.length - 1 ? 'border-red-500 text-red-500' :
                    'border-yellow-500 text-yellow-500'
                  }`}>
                    <CircleDot size={12} fill="currentColor" />
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={wp.placeholder}
                      className="w-full bg-zinc-800 text-white px-4 py-3 rounded-xl border border-zinc-700/50 focus:border-white/20 focus:bg-zinc-700 outline-none transition-all placeholder:text-zinc-500 text-sm"
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
          
          <div className="flex justify-end">
            <button onClick={addStop} className="flex items-center gap-1 py-2 px-3 rounded-lg text-xs font-bold text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
              <Plus size={14} /> Add Stop
            </button>
            {/* Removed GO button - auto triggers now */}
          </div>
        </div>
      )}
    </div>
  );
}