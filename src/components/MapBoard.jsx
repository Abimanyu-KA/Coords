import React, { useState, useEffect, useRef } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import { supabase } from '../supabaseClient';
import RouteCreator from './RouteCreator';
import { Radio, Users, Activity } from 'lucide-react'; 
import * as turf from '@turf/turf'; // <--- IMPORT MATH LIBRARY
import 'mapbox-gl/dist/mapbox-gl.css';

// ⚠️ PASTE YOUR MAPBOX TOKEN
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapBoard({ flyToLocation, routeWaypoints, viewingRoute, session }) {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState({
    longitude: 80.2707, latitude: 13.0827, zoom: 12
  });

  const [points, setPoints] = useState([]); 
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Radar State
  const [isRadarActive, setIsRadarActive] = useState(false);
  const [otherRiders, setOtherRiders] = useState({});
  const channelRef = useRef(null);

  // --- RADAR LOGIC ---
  useEffect(() => {
    if (isRadarActive && session) {
      const channel = supabase.channel('chennai_riders');
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const riders = {};
          for (const id in state) {
            if (id !== session.user.id) riders[id] = state[id][0];
          }
          setOtherRiders(riders);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') startBroadcasting(channel);
        });
      channelRef.current = channel;
    } else {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setOtherRiders({});
      }
    }
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [isRadarActive, session]);

  const startBroadcasting = (channel) => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        channel.track({
          user: session.user.email,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading || 0,
          online_at: new Date().toISOString()
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  };

  // --- MAP LOGIC ---
  useEffect(() => {
    if (flyToLocation && mapRef.current) {
      mapRef.current.flyTo({ center: flyToLocation.coords, zoom: 14, duration: 2000 });
    }
  }, [flyToLocation]);

  useEffect(() => {
    if (viewingRoute && mapRef.current) {
      setPoints([]); setRouteGeoJSON(null); setRouteStats(null);
      if (viewingRoute.path && viewingRoute.path.coordinates) {
        const start = viewingRoute.path.coordinates[0];
        mapRef.current.flyTo({ center: start, zoom: 13, duration: 2000 });
      }
    }
  }, [viewingRoute]);

  useEffect(() => {
    if (routeWaypoints && routeWaypoints.length >= 2) {
      const coords = routeWaypoints.map(wp => wp.coords);
      setPoints(coords); 
      fetchRoute(coords);
      
      if (mapRef.current) {
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        mapRef.current.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
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
    
    // ⚡ FIX: Added '&overview=full' for SMOOTH geometry
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (!json.routes || json.routes.length === 0) return;
      
      const route = json.routes[0];
      const geometry = route.geometry;
      
      // --- 🧮 SINUOSITY CALCULATION (THE MATH) ---
      const line = turf.lineString(geometry.coordinates);
      const length = turf.length(line, { units: 'kilometers' }); // Actual road distance
      
      const startPoint = turf.point(geometry.coordinates[0]);
      const endPoint = turf.point(geometry.coordinates[geometry.coordinates.length - 1]);
      const crowDistance = turf.distance(startPoint, endPoint, { units: 'kilometers' }); // Straight line
      
      // Sinuosity = Actual / Straight
      // If start == end (loop), this divides by zero, so we handle that.
      let sinuosity = crowDistance > 0 ? (length / crowDistance) : 1;
      
      // Cap loops or crazy values
      if (sinuosity > 5) sinuosity = 5; 

      // Determine Vibe
      let vibe = 'Straight';
      if (sinuosity > 1.2) vibe = 'Curvy';
      if (sinuosity > 1.5) vibe = 'Twisty';
      if (sinuosity > 2.0) vibe = 'Noodle';

      setRouteGeoJSON({ type: 'Feature', geometry: geometry });
      
      const mins = Math.round(route.duration / 60);
      setRouteStats({ 
        km: length.toFixed(1), 
        mins,
        sinuosity: sinuosity.toFixed(2), // Store the score
        vibe // Store the auto-detected vibe
      });
      
      setIsSaving(true); 
    } catch (err) { console.error("Route error", err); }
  };

  const handleSaveRoute = async (details) => {
    if (!routeGeoJSON) return;
    
    // Auto-fill vibe based on math if user didn't change it manually? 
    // For now we just trust the user, but we could pass 'routeStats.vibe' as default
    
    const { error } = await supabase.from('routes').insert({
      name: details.name, 
      vibe: details.vibe, 
      surface: details.surface, 
      path: routeGeoJSON.geometry, 
      difficulty: 1, 
      created_by: session?.user?.id 
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

        {/* Radar Button */}
        <div className="absolute top-24 right-2 z-10 flex flex-col gap-2">
          <button 
            onClick={() => setIsRadarActive(!isRadarActive)}
            className={`p-3 rounded-lg shadow-xl border border-zinc-700 transition-all ${
              isRadarActive ? 'bg-purple-600 text-white animate-pulse' : 'bg-black text-zinc-400'
            }`}
          >
            {isRadarActive ? <Radio size={20} className="animate-spin-slow" /> : <Users size={20} />}
          </button>
        </div>

        {/* Radar Dots */}
        {Object.keys(otherRiders).map((key) => {
          const rider = otherRiders[key];
          return (
            <Marker key={key} longitude={rider.lng} latitude={rider.lat}>
              <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-[0_0_10px_#a855f7]"></div>
            </Marker>
          );
        })}

        {/* Basic Layers */}
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

        {/* 📊 UPDATED STATS BUBBLE with Sinuosity */}
        {routeStats && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur border border-zinc-700 px-5 py-3 rounded-2xl shadow-2xl flex flex-col items-center gap-1 z-50 min-w-[140px]">
            
            {/* Top Row: Basic Stats */}
            <div className="flex gap-3 text-sm">
              <span className="text-white font-bold">{routeStats.km} km</span>
              <span className="text-zinc-600">|</span>
              <span className="text-blue-400 font-bold">{routeStats.mins} min</span>
            </div>

            {/* Bottom Row: The Fun Factor */}
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-zinc-800 w-full justify-center">
              <Activity size={12} className={routeStats.sinuosity > 1.2 ? "text-green-400" : "text-zinc-500"} />
              <span className={`text-xs font-bold uppercase ${
                routeStats.sinuosity > 1.5 ? "text-purple-400" : 
                routeStats.sinuosity > 1.2 ? "text-green-400" : "text-zinc-500"
              }`}>
                {routeStats.vibe} ({routeStats.sinuosity})
              </span>
            </div>

          </div>
        )}

        {isSaving && (
          <RouteCreator 
            // We pass the calculated vibe as a suggestion
            initialVibe={routeStats?.vibe?.toLowerCase()} 
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