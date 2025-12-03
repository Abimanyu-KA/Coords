import React, { useState, useEffect, useRef } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import { supabase } from '../supabaseClient';
import RouteCreator from './RouteCreator';
import { Radio, Users } from 'lucide-react'; // New Icons
import 'mapbox-gl/dist/mapbox-gl.css';

// ⚠️ PASTE YOUR MAPBOX TOKEN HERE
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapBoard({ flyToLocation, routeWaypoints, viewingRoute, session }) {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState({
    longitude: 80.2707, latitude: 13.0827, zoom: 12
  });

  // Basic Map State
  const [points, setPoints] = useState([]); 
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- 📡 RADAR STATE (The New Stuff) ---
  const [isRadarActive, setIsRadarActive] = useState(false);
  const [otherRiders, setOtherRiders] = useState({}); // Stores other users { 'user_id': {lat, lng} }
  const channelRef = useRef(null); // Keep the connection alive

  // 1. RADAR LOGIC: Subscribe/Unsubscribe
  useEffect(() => {
    if (isRadarActive && session) {
      // A. JOIN THE CHANNEL
      const channel = supabase.channel('chennai_riders');
      
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const riders = {};
          
          // Flatten the weird Presence object structure
          for (const id in state) {
            if (id !== session.user.id) { // Don't show myself
               // state[id] is an array of "presences" for that user
               // We take the latest one (index 0)
               riders[id] = state[id][0];
            }
          }
          setOtherRiders(riders);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log("📡 Radar Online: Connected to grid.");
            startBroadcasting(channel);
          }
        });

      channelRef.current = channel;

    } else {
      // B. LEAVE THE CHANNEL
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setOtherRiders({});
        console.log("📡 Radar Offline: Disconnected.");
      }
    }

    // Cleanup on unmount
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [isRadarActive, session]);

  // 2. BROADCAST LOOP: Send my location every 2 seconds
  const startBroadcasting = (channel) => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords;
        
        // Send my data to the channel
        channel.track({
          user: session.user.email,
          lat: latitude,
          lng: longitude,
          heading: heading || 0,
          online_at: new Date().toISOString()
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    // Stop broadcasting when Radar turns off
    return () => navigator.geolocation.clearWatch(watchId);
  };


  // --- EXISTING MAP LOGIC (Keep scrolling down) ---

  // 1. WATCH FOR SINGLE SEARCH RESULTS
  useEffect(() => {
    if (flyToLocation && mapRef.current) {
      mapRef.current.flyTo({ center: flyToLocation.coords, zoom: 14, duration: 2000 });
    }
  }, [flyToLocation]);

  // 2. WATCH FOR "VIEW SAVED ROUTE"
  useEffect(() => {
    if (viewingRoute && mapRef.current) {
      setPoints([]); setRouteGeoJSON(null); setRouteStats(null);
      if (viewingRoute.path && viewingRoute.path.coordinates) {
        mapRef.current.flyTo({ center: viewingRoute.path.coordinates[0], zoom: 13, duration: 2000 });
      }
    }
  }, [viewingRoute]);

  // 3. WATCH FOR MULTI-POINT REQUESTS
  useEffect(() => {
    if (routeWaypoints && routeWaypoints.length >= 2) {
      const coords = routeWaypoints.map(wp => wp.coords);
      setPoints(coords); 
      fetchRoute(coords);
      
      if (mapRef.current) {
        const longitudes = coords.map(c => c[0]);
        const latitudes = coords.map(c => c[1]);
        mapRef.current.fitBounds(
          [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]],
          { padding: 100, duration: 2000 }
        );
      }
    }
  }, [routeWaypoints]);

  const handleMapClick = async (event) => {
    if (isSaving || viewingRoute) return; 
    const { lng, lat } = event.lngLat;
    const newPoints = [...points, [lng, lat]];
    setPoints(newPoints);
    if (newPoints.length >= 2) {
      fetchRoute(newPoints);
    }
  };

  const fetchRoute = async (coords) => {
    const coordString = coords.map(p => `${p[0]},${p[1]}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (!json.routes || json.routes.length === 0) return;
      
      const route = json.routes[0];
      setRouteGeoJSON({ type: 'Feature', geometry: route.geometry });
      
      const km = (route.distance / 1000).toFixed(1);
      const mins = Math.round(route.duration / 60);
      setRouteStats({ km, mins });
      setIsSaving(true); 
    } catch (err) { console.error("Route error", err); }
  };

  const handleSaveRoute = async (details) => {
    if (!routeGeoJSON) return;
    const { error } = await supabase.from('routes').insert({
      name: details.name, vibe: details.vibe, surface: details.surface, path: routeGeoJSON.geometry, difficulty: 1, created_by: session?.user?.id 
    });
    if (error) alert('Error saving!');
    else {
      alert('Route Saved!');
      setPoints([]); setRouteGeoJSON(null); setRouteStats(null); setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-full absolute top-0 left-0 z-0">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        cursor="crosshair"
      >
        <GeolocateControl position="top-right" />
        <NavigationControl position="top-right" showCompass={false} />

        {/* --- 📡 RADAR BUTTON --- */}
        <div className="absolute top-24 right-2 z-10 flex flex-col gap-2">
          <button 
            onClick={() => setIsRadarActive(!isRadarActive)}
            className={`p-3 rounded-lg shadow-xl border border-zinc-700 transition-all ${
              isRadarActive 
                ? 'bg-purple-600 text-white animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.6)]' 
                : 'bg-black text-zinc-400 hover:text-white'
            }`}
          >
            {isRadarActive ? <Radio size={20} className="animate-spin-slow" /> : <Users size={20} />}
          </button>
        </div>

        {/* --- RENDER OTHER RIDERS (NEON DOTS) --- */}
        {Object.keys(otherRiders).map((key) => {
          const rider = otherRiders[key];
          return (
            <Marker key={key} longitude={rider.lng} latitude={rider.lat}>
              <div className="flex flex-col items-center">
                {/* The Dot */}
                <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-[0_0_10px_#a855f7]"></div>
                {/* The Label (Email) */}
                <span className="bg-black/80 text-white text-[10px] px-1 rounded mt-1 backdrop-blur-sm border border-zinc-700">
                  {rider.user.split('@')[0]}
                </span>
              </div>
            </Marker>
          );
        })}

        {/* --- STANDARD MAP LAYERS --- */}
        {points.map((p, i) => (
          <Marker key={i} longitude={p[0]} latitude={p[1]} color={i === 0 ? "#4ade80" : "#ef4444"} />
        ))}

        {routeGeoJSON && !viewingRoute && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer id="route-layer" type="line" paint={{ 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.8 }} />
          </Source>
        )}

        {viewingRoute && viewingRoute.path && (
          <Source id="view-route" type="geojson" data={{ type: 'Feature', geometry: viewingRoute.path }}>
            <Layer id="view-route-layer" type="line" paint={{ 'line-color': '#a855f7', 'line-width': 5, 'line-opacity': 0.9 }} />
          </Source>
        )}

        {flyToLocation && (
          <Marker longitude={flyToLocation.coords[0]} latitude={flyToLocation.coords[1]} color="white">
             <div className="animate-bounce text-2xl">📍</div>
          </Marker>
        )}

        {routeStats && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 px-4 py-2 rounded-full shadow-xl flex gap-3 z-50">
            <span className="text-white font-bold">{routeStats.km} km</span>
            <span className="text-zinc-500">|</span>
            <span className="text-blue-400 font-bold">{routeStats.mins} min</span>
          </div>
        )}

        {isSaving && (
          <RouteCreator 
            onSave={handleSaveRoute} 
            onCancel={() => {
              setIsSaving(false); setPoints([]); setRouteGeoJSON(null); setRouteStats(null);
            }} 
          />
        )}

      </Map>
    </div>
  );
}