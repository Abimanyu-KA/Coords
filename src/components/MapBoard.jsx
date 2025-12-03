import React, { useState, useEffect, useRef } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import { supabase } from '../supabaseClient';
import RouteCreator from './RouteCreator';
import { Radio, Users, Activity, Disc, Square, Gauge, Timer, Map as MapIcon, Shield, Navigation as ArrowIcon } from 'lucide-react';
import * as turf from '@turf/turf'; 
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

  // --- RADAR STATE ---
  const [isRadarActive, setIsRadarActive] = useState(false);
  const [otherRiders, setOtherRiders] = useState({});
  const [syncGroupName, setSyncGroupName] = useState(null); // Renamed from packName
  const channelRef = useRef(null);
  
  // Refs for logic that doesn't need re-renders
  const myLocationRef = useRef(null); 
  const lastVibrationRef = useRef(0);

  // --- RECORDING STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState([]); 
  const recordingIdRef = useRef(null); 
  const [liveStats, setLiveStats] = useState({ speed: 0, distance: 0, duration: 0 });
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // --- 📡 RADAR LOGIC (SYNC UPGRADE) ---
  useEffect(() => {
    if (isRadarActive && session) {
      
      const connectToRadar = async () => {
        // 1. CHECK FOR SYNC GROUP
        const { data: membership } = await supabase
          .from('group_members')
          .select('group_id, groups(name)')
          .eq('user_id', session.user.id)
          .order('joined_at', { ascending: false })
          .limit(1)
          .single();

        let channelId = 'public_global';
        
        if (membership && membership.groups) {
          channelId = `sync_${membership.group_id}`; // Updated channel prefix
          setSyncGroupName(membership.groups.name);
          console.log(`📡 Syncing with Group: ${membership.groups.name}`);
        } else {
          setSyncGroupName(null);
          console.log("📡 Joining Public Sync");
        }

        // 2. SUBSCRIBE TO THE CHANNEL
        const channel = supabase.channel(channelId);
        
        channel
          .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            
            // Smart State Update: Merge new positions with existing history (Trails)
            setOtherRiders(prevRiders => {
              const nextRiders = {};
              const now = Date.now();

              for (const id in newState) {
                if (id === session.user.id) continue; // Skip myself

                const latestData = newState[id][0]; // Mapbox/Supabase keeps latest at index 0 usually
                const prevData = prevRiders[id];
                
                // Initialize or append history
                let history = prevData?.history || [];
                
                // Only add to trail if position changed significantly to avoid jitter clutter
                const lastPoint = history.length > 0 ? history[history.length - 1] : null;
                const isNewPoint = !lastPoint || (lastPoint[0] !== latestData.lng || lastPoint[1] !== latestData.lat);
                
                if (isNewPoint) {
                  history = [...history, [latestData.lng, latestData.lat]].slice(-20); // Keep last 20 points (Tail)
                }

                // --- HAPTICS LOGIC ---
                // Check proximity to me
                if (myLocationRef.current) {
                  const dist = turf.distance(
                    turf.point([myLocationRef.current.lng, myLocationRef.current.lat]), 
                    turf.point([latestData.lng, latestData.lat]), 
                    { units: 'kilometers' }
                  );
                  
                  // If closer than 50m (0.05km) and haven't vibrated in 10s
                  if (dist < 0.05 && (now - lastVibrationRef.current > 10000)) {
                    if (navigator.vibrate) navigator.vibrate(200);
                    lastVibrationRef.current = now;
                    console.log(`⚠️ Proximity Alert: ${latestData.user} is nearby!`);
                  }
                }

                nextRiders[id] = {
                  ...latestData,
                  history
                };
              }
              return nextRiders;
            });
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') startBroadcasting(channel);
          });
        
        channelRef.current = channel;
      };

      connectToRadar();

    } else {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setOtherRiders({});
        setSyncGroupName(null);
      }
    }
    
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [isRadarActive, session]);

  const startBroadcasting = (channel) => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords;
        
        // Update Ref for Haptics calculations
        myLocationRef.current = { lat: latitude, lng: longitude };

        channel.track({
          user: session.user.email,
          lat: latitude,
          lng: longitude,
          heading: heading || 0, // Send heading for arrow rotation
          online_at: new Date().toISOString()
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  };

  // --- RECORDING LOGIC ---
  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordedPath([]);
    setPoints([]);
    setRouteGeoJSON(null);
    setLiveStats({ speed: 0, distance: 0, duration: 0 });
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setLiveStats(prev => ({ ...prev, duration: seconds }));
    }, 1000);
    recordingIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const currentSpeedKmh = speed ? Math.round(speed * 3.6) : 0; 
        const newPoint = { lng: longitude, lat: latitude, speed: currentSpeedKmh, timestamp: Date.now() };
        setRecordedPath(prev => {
          let distAdded = 0;
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            distAdded = turf.distance(turf.point([last.lng, last.lat]), turf.point([longitude, latitude]), {units: 'kilometers'});
            if (distAdded < 0.005) return prev; 
          }
          setLiveStats(s => ({ ...s, speed: currentSpeedKmh, distance: s.distance + distAdded }));
          return [...prev, newPoint];
        });
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
      },
      (err) => console.error("Recording error:", err),
      { enableHighAccuracy: true, distanceFilter: 5 }
    );
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingIdRef.current) navigator.geolocation.clearWatch(recordingIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordedPath.length < 5) { alert("Route too short to save!"); return; }

    const coordinates = recordedPath.map(p => [p.lng, p.lat]);
    const geometry = { type: 'LineString', coordinates };
    const line = turf.lineString(coordinates);
    const length = turf.length(line, { units: 'kilometers' });
    const startPoint = turf.point(coordinates[0]);
    const endPoint = turf.point(coordinates[coordinates.length - 1]);
    const crowDistance = turf.distance(startPoint, endPoint, { units: 'kilometers' });
    
    let sinuosity = crowDistance > 0 ? (length / crowDistance) : 1;
    if (sinuosity > 5) sinuosity = 5;
    let vibe = sinuosity > 1.2 ? 'Curvy' : 'Straight';
    if (sinuosity > 1.5) vibe = 'Twisty';

    const speeds = recordedPath.map(p => p.speed);
    const maxSpeed = Math.max(...speeds);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

    setRouteGeoJSON({ type: 'Feature', geometry });
    setRouteStats({ 
      km: length.toFixed(1), mins: Math.floor(liveStats.duration / 60), sinuosity: sinuosity.toFixed(2), 
      vibe, maxSpeed: maxSpeed.toFixed(0), avgSpeed: avgSpeed.toFixed(0)
    });
    setIsSaving(true);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
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
        mapRef.current.flyTo({ center: viewingRoute.path.coordinates[0], zoom: 13, duration: 2000 });
      }
    }
  }, [viewingRoute]);

  useEffect(() => {
    if (routeWaypoints && routeWaypoints.length >= 2) {
      const coords = routeWaypoints.map(wp => wp.coords);
      setPoints(coords); fetchRoute(coords);
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
    if (isSaving || viewingRoute || isRecording) return;
    const { lng, lat } = event.lngLat;
    const newPoints = [...points, [lng, lat]];
    setPoints(newPoints);
    if (newPoints.length >= 2) fetchRoute(newPoints);
  };

  const fetchRoute = async (coords) => {
    const coordString = coords.map(p => `${p[0]},${p[1]}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (!json.routes || json.routes.length === 0) return;
      const route = json.routes[0];
      const geometry = route.geometry;
      const line = turf.lineString(geometry.coordinates);
      const length = turf.length(line, { units: 'kilometers' });
      const startPoint = turf.point(geometry.coordinates[0]);
      const endPoint = turf.point(geometry.coordinates[geometry.coordinates.length - 1]);
      const crowDistance = turf.distance(startPoint, endPoint, { units: 'kilometers' });
      let sinuosity = crowDistance > 0 ? (length / crowDistance) : 1;
      if (sinuosity > 5) sinuosity = 5; 
      let vibe = sinuosity > 1.2 ? 'Curvy' : 'Straight';
      setRouteGeoJSON({ type: 'Feature', geometry: geometry });
      const mins = Math.round(route.duration / 60);
      setRouteStats({ km: length.toFixed(1), mins, sinuosity: sinuosity.toFixed(2), vibe });
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
      setPoints([]); setRouteGeoJSON(null); setRouteStats(null); setIsSaving(false); setRecordedPath([]);
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
        cursor={isRecording ? 'default' : 'crosshair'}
      >
        <GeolocateControl position="bottom-right" style={{marginBottom: '100px', marginRight: '10px'}} />
        <NavigationControl position="bottom-right" style={{marginBottom: '100px', marginRight: '10px'}} showCompass={false} />

        {/* --- 🐺 SYNC STATUS HUD --- */}
        {isRadarActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur rounded-full border border-zinc-700 shadow-xl z-50 animate-in slide-in-from-top-5">
            <div className={`w-2 h-2 rounded-full animate-pulse ${syncGroupName ? 'bg-purple-500' : 'bg-green-500'}`}></div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {syncGroupName ? `SYNC: ${syncGroupName}` : 'SYNC: PUBLIC'}
            </span>
            {syncGroupName && <Shield size={12} className="text-purple-500" />}
          </div>
        )}

        {/* Live Recording Cockpit */}
        {isRecording && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/90 border border-red-900/50 shadow-2xl rounded-2xl p-4 flex gap-6 z-50 animate-pulse-slow">
            <div className="flex flex-col items-center min-w-[60px]">
              <div className="text-3xl font-black text-white italic tracking-tighter">{liveStats.speed}</div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><Gauge size={10} /> km/h</div>
            </div>
            <div className="w-px bg-zinc-800"></div>
            <div className="flex flex-col items-center min-w-[60px]">
              <div className="text-3xl font-black text-white tracking-tighter">{liveStats.distance.toFixed(1)}</div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><MapIcon size={10} /> km</div>
            </div>
            <div className="w-px bg-zinc-800"></div>
            <div className="flex flex-col items-center min-w-[60px]">
              <div className="text-xl font-mono font-bold text-white mt-2">{formatTime(liveStats.duration)}</div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1"><Timer size={10} /> time</div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="absolute top-24 right-2 z-10 flex flex-col gap-2">
          <button onClick={() => setIsRadarActive(!isRadarActive)} className={`p-3 rounded-lg shadow-xl border border-zinc-700 transition-all ${isRadarActive ? 'bg-purple-600 text-white animate-pulse' : 'bg-black text-zinc-400'}`}>
            {isRadarActive ? <Radio size={20} className="animate-spin-slow" /> : <Users size={20} />}
          </button>
          <button onClick={toggleRecording} className={`p-3 rounded-lg shadow-xl border border-zinc-700 transition-all ${isRecording ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] scale-110' : 'bg-black text-zinc-400'}`}>
            {isRecording ? <Square size={20} fill="currentColor" /> : <Disc size={20} />}
          </button>
        </div>

        {/* --- RENDER OTHER RIDERS --- */}
        {Object.keys(otherRiders).map((key) => {
          const rider = otherRiders[key];
          return (
            <React.Fragment key={key}>
              
              {/* 1. TAIL TRAIL (Cyan Line) */}
              {rider.history && rider.history.length > 1 && (
                <Source id={`trail-${key}`} type="geojson" data={{ type: 'Feature', geometry: { type: 'LineString', coordinates: rider.history }}}>
                  <Layer 
                    id={`trail-layer-${key}`} 
                    type="line" 
                    paint={{ 
                      'line-color': '#06b6d4', // Cyan
                      'line-width': 3, 
                      'line-opacity': 0.6,
                      'line-blur': 1
                    }} 
                  />
                </Source>
              )}

              {/* 2. DIRECTIONAL MARKER (Arrow) */}
              <Marker longitude={rider.lng} latitude={rider.lat}>
                <div 
                  className="flex flex-col items-center transition-transform duration-500 ease-linear"
                  style={{ transform: `rotate(${rider.heading || 0}deg)` }} // Rotate based on GPS heading
                >
                  <ArrowIcon 
                    size={28} 
                    fill="#a855f7" // Purple fill
                    className="text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" 
                  />
                </div>
                {/* Name Label (Non-rotating) */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                   <span className="bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded border border-zinc-700">
                    {rider.user.split('@')[0]}
                  </span>
                </div>
              </Marker>
            </React.Fragment>
          );
        })}

        {points.map((p, i) => (
          <Marker key={i} longitude={p[0]} latitude={p[1]} color={i === 0 ? "#4ade80" : "#ef4444"} />
        ))}
        {isRecording && recordedPath.length > 1 && (
          <Source id="recording-line" type="geojson" data={{ type: 'Feature', geometry: { type: 'LineString', coordinates: recordedPath.map(p=>[p.lng, p.lat]) }}}>
            <Layer id="recording-layer" type="line" paint={{ 'line-color': '#ef4444', 'line-width': 4, 'line-opacity': 1, 'line-dasharray': [2, 1] }} />
          </Source>
        )}
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

        {/* Stats & Save */}
        {routeStats && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur border border-zinc-700 px-5 py-3 rounded-2xl shadow-2xl flex flex-col items-center gap-1 z-50 min-w-[140px]">
            <div className="flex gap-3 text-sm">
              <span className="text-white font-bold">{routeStats.km} km</span>
              <span className="text-zinc-600">|</span>
              <span className="text-blue-400 font-bold">{routeStats.mins} min</span>
            </div>
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
            initialVibe={routeStats?.vibe?.toLowerCase()} 
            onSave={handleSaveRoute} 
            onCancel={() => { setIsSaving(false); setPoints([]); setRouteGeoJSON(null); setRouteStats(null); setRecordedPath([]); }} 
          />
        )}
      </Map>
    </div>
  );
}