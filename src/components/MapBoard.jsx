import React, { useState, useEffect, useRef } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import { supabase } from '../supabaseClient';
import RouteCreator from './RouteCreator';
import NavigationHUD from './NavigationHUD';
import { Radio, Users, Gauge, Timer, Map as MapIcon, Shield, Navigation as ArrowIcon, Disc, Square, Activity } from 'lucide-react';
import * as turf from '@turf/turf'; 
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapBoard({ 
  flyToLocation, 
  routeWaypoints, 
  viewingRoute, 
  directNavDestination, 
  onNavigationStarted, 
  onRouteOptionsUpdate, 
  onNavigationActive, 
  session 
}) {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState({
    longitude: 80.2707, latitude: 13.0827, zoom: 12
  });

  const [points, setPoints] = useState([]); 
  
  // State
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Multi-Route State
  const [allRoutes, setAllRoutes] = useState([]); 
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0); 

  // Navigation State
  const [navSteps, setNavSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState(0);

  // Radar & Recording State
  const [isRadarActive, setIsRadarActive] = useState(false);
  const [otherRiders, setOtherRiders] = useState({});
  const [syncGroupName, setSyncGroupName] = useState(null); 
  const channelRef = useRef(null);
  const myLocationRef = useRef(null); 
  const lastVibrationRef = useRef(0);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState([]); 
  const recordingIdRef = useRef(null); 
  const [liveStats, setLiveStats] = useState({ speed: 0, distance: 0, duration: 0 });
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // --- 1. SYNC UI WITH PARENT ---
  useEffect(() => {
    if (allRoutes.length > 0 && onRouteOptionsUpdate) {
        onRouteOptionsUpdate({
            options: allRoutes.map(r => ({ id: r.id, stats: r.stats, tag: r.tag })),
            selectedId: selectedRouteIdx,
            onSelect: (id) => setSelectedRouteIdx(id) 
        });
    }
  }, [selectedRouteIdx, allRoutes]);

  // --- 2. RECORDING LOGIC (Defined Early) ---
  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording(false);
  };

  const startRecording = (isNavigating = false) => {
    setIsRecording(true);
    setRecordedPath([]);
    
    // If just Free Riding, clear the planned map lines.
    // If Navigating, keep the planned route visible.
    if (!isNavigating) {
      setPoints([]);
      setRouteGeoJSON(null);
      setNavSteps([]);
      setAllRoutes([]);
      if (onRouteOptionsUpdate) onRouteOptionsUpdate(null);
    }
    
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
            distAdded = turf.distance(
              turf.point([last.lng, last.lat]), 
              turf.point([longitude, latitude]), 
              {units: 'kilometers'}
            );
            if (distAdded < 0.005) return prev; 
          }
          setLiveStats(s => ({ ...s, speed: currentSpeedKmh, distance: s.distance + distAdded }));
          return [...prev, newPoint];
        });

        // Navigation Guidance Logic
        if (navSteps.length > 0 && currentStepIndex < navSteps.length) {
           const currentStep = navSteps[currentStepIndex];
           const nextStep = navSteps[currentStepIndex + 1];
           if (nextStep) {
             const maneuverPoint = turf.point(nextStep.maneuver.location);
             const myPoint = turf.point([longitude, latitude]);
             const dist = turf.distance(myPoint, maneuverPoint, { units: 'meters' });
             setDistanceToNextStep(dist);
             if (dist < 30) {
               setCurrentStepIndex(prev => Math.min(prev + 1, navSteps.length - 1));
               if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
             }
           } else {
             setDistanceToNextStep(0);
           }
        }
        
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 18, pitch: 60, bearing: pos.coords.heading || 0 });
      },
      (err) => console.error("Recording error:", err),
      { enableHighAccuracy: true, distanceFilter: 5 }
    );
  };

  const stopRecording = () => {
    setIsRecording(false);
    setNavSteps([]); 
    setCurrentStepIndex(0);
    if (recordingIdRef.current) navigator.geolocation.clearWatch(recordingIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordedPath.length < 5) return;

    // Calculate Stats for Save
    const coordinates = recordedPath.map(p => [p.lng, p.lat]);
    const geometry = { type: 'LineString', coordinates };
    const line = turf.lineString(coordinates);
    const length = turf.length(line, { units: 'kilometers' });
    
    // Sinuosity
    const startPoint = turf.point(coordinates[0]);
    const endPoint = turf.point(coordinates[coordinates.length - 1]);
    const crowDistance = turf.distance(startPoint, endPoint, { units: 'kilometers' });
    let sinuosity = crowDistance > 0 ? (length / crowDistance) : 1;
    if (sinuosity > 5) sinuosity = 5;
    let vibe = 'Straight';
    if (sinuosity > 1.2) vibe = 'Curvy';
    if (sinuosity > 1.5) vibe = 'Twisty';

    const speeds = recordedPath.map(p => p.speed);
    const maxSpeed = Math.max(...speeds);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

    setRouteGeoJSON({ type: 'Feature', geometry });
    setRouteStats({ 
      km: length.toFixed(1), 
      mins: Math.floor(liveStats.duration / 60), 
      sinuosity: sinuosity.toFixed(2), 
      vibe, 
      maxSpeed: maxSpeed.toFixed(0), 
      avgSpeed: avgSpeed.toFixed(0)
    });
    setIsSaving(true);
  };

  // --- 3. MULTI-ROUTE FETCHING ---
  const fetchRoutes = async (coords) => {
    const coordString = coords.map(p => `${p[0]},${p[1]}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&overview=full&steps=true&alternatives=true&access_token=${MAPBOX_TOKEN}`;
    
    try {
      const response = await fetch(url);
      const json = await response.json();
      if (!json.routes || json.routes.length === 0) return;
      
      const options = json.routes.map((route, index) => {
        const line = turf.lineString(route.geometry.coordinates);
        const length = turf.length(line, { units: 'kilometers' });
        const mins = Math.round(route.duration / 60);
        
        const startPoint = turf.point(route.geometry.coordinates[0]);
        const endPoint = turf.point(route.geometry.coordinates[route.geometry.coordinates.length - 1]);
        const crowDistance = turf.distance(startPoint, endPoint, { units: 'kilometers' });
        let sinuosity = crowDistance > 0 ? (length / crowDistance) : 1;
        if (sinuosity > 5) sinuosity = 5;
        
        let vibe = 'Straight';
        if (sinuosity > 1.2) vibe = 'Curvy';
        if (sinuosity > 1.5) vibe = 'Twisty';

        return {
          id: index,
          geometry: route.geometry,
          steps: route.legs[0]?.steps || [],
          stats: {
            km: length.toFixed(1),
            mins: mins,
            sinuosity: sinuosity.toFixed(2),
            vibe: vibe
          },
          score: { time: mins, dist: length, fun: sinuosity }
        };
      });

      // Intelligent Tagging
      const fastestIdx = options.reduce((iMin, x, i, arr) => x.score.time < arr[iMin].score.time ? i : iMin, 0);
      const shortestIdx = options.reduce((iMin, x, i, arr) => x.score.dist < arr[iMin].score.dist ? i : iMin, 0);
      const twistiestIdx = options.reduce((iMax, x, i, arr) => x.score.fun > arr[iMax].score.fun ? i : iMax, 0);
      const straightestIdx = options.reduce((iMin, x, i, arr) => x.score.fun < arr[iMin].score.fun ? i : iMin, 0);

      options.forEach((opt, idx) => {
          if (idx === fastestIdx) opt.tag = "Fastest";
          else if (idx === shortestIdx) opt.tag = "Shortest";
          else if (idx === twistiestIdx && opt.score.fun > 1.1) opt.tag = "Twisty";
          else if (idx === straightestIdx) opt.tag = "Straightest";
          else opt.tag = "Alternative"; 
      });

      // Remove duplicate tags logic
      if (options[fastestIdx].tag === options[shortestIdx].tag && options.length > 1) {
          if (fastestIdx !== shortestIdx) options[shortestIdx].tag = "Shortest";
      }

      setAllRoutes(options);
      setSelectedRouteIdx(fastestIdx); 
      
    } catch (err) { console.error("Route error", err); }
  };

  // --- 4. EFFECTS ---

  // Update Map when route selection changes
  useEffect(() => {
    if (allRoutes.length > 0 && allRoutes[selectedRouteIdx]) {
        const route = allRoutes[selectedRouteIdx];
        setRouteGeoJSON({ type: 'Feature', geometry: route.geometry });
        setNavSteps(route.steps);
    }
  }, [selectedRouteIdx, allRoutes]);

  // Handle Direct Navigation Request
  useEffect(() => {
    if (directNavDestination) {
      // Start navigation to the destination
      const targetCoords = points.length > 0 ? points[points.length-1] : directNavDestination.coords;
      handleStartNavigationTo(targetCoords); 
      onNavigationStarted(); 
    }
  }, [directNavDestination]);

  // Sync Nav State with Parent
  useEffect(() => {
    if (onNavigationActive) {
      onNavigationActive(isRecording);
    }
  }, [isRecording]);

  // Radar Logic
  useEffect(() => {
    if (isRadarActive && session) {
      const connectToRadar = async () => {
        const { data: membership } = await supabase.from('group_members').select('group_id, groups(name)').eq('user_id', session.user.id).order('joined_at', { ascending: false }).limit(1).single();
        let channelId = 'public_global';
        if (membership && membership.groups) {
          channelId = `sync_${membership.group_id}`;
          setSyncGroupName(membership.groups.name);
        } else { setSyncGroupName(null); }
        const channel = supabase.channel(channelId);
        channel.on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            setOtherRiders(prevRiders => {
              const nextRiders = {};
              for (const id in newState) {
                if (id === session.user.id) continue;
                nextRiders[id] = { ...newState[id][0], history: prevRiders[id]?.history || [] };
              }
              return nextRiders;
            });
          }).subscribe(async (status) => { if (status === 'SUBSCRIBED') startBroadcasting(channel); });
        channelRef.current = channel;
      };
      connectToRadar();
    } else {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; setOtherRiders({}); setSyncGroupName(null); }
    }
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [isRadarActive, session]);

  const startBroadcasting = (channel) => {
    const watchId = navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude, heading } = pos.coords;
        myLocationRef.current = { lat: latitude, lng: longitude };
        channel.track({ user: session.user.email, lat: latitude, lng: longitude, heading: heading || 0, online_at: new Date().toISOString() });
      }, (err) => console.error(err), { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
    return () => navigator.geolocation.clearWatch(watchId);
  };

  // Map & Waypoint Effects
  useEffect(() => {
    if (flyToLocation && mapRef.current) {
      mapRef.current.flyTo({ center: flyToLocation.coords, zoom: 14, duration: 2000 });
    }
  }, [flyToLocation]);

  useEffect(() => {
    if (viewingRoute && mapRef.current) {
      setPoints([]); setRouteGeoJSON(null); if(onRouteOptionsUpdate) onRouteOptionsUpdate(null); setNavSteps([]);
      if (viewingRoute.path && viewingRoute.path.coordinates) {
        mapRef.current.flyTo({ center: viewingRoute.path.coordinates[0], zoom: 13, duration: 2000 });
      }
    }
  }, [viewingRoute]);

  useEffect(() => {
    if (routeWaypoints && routeWaypoints.length >= 2) {
      const processWaypoints = async () => {
        let finalCoords = [];
        if (routeWaypoints[0].isCurrent) {
          try {
            const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
            finalCoords.push([pos.coords.longitude, pos.coords.latitude]);
          } catch (e) { alert("Enable GPS."); return; }
        } else {
          finalCoords.push(routeWaypoints[0].coords);
        }
        for (let i = 1; i < routeWaypoints.length; i++) {
          finalCoords.push(routeWaypoints[i].coords);
        }
        setPoints(finalCoords);
        fetchRoutes(finalCoords);
        if (mapRef.current) {
          const lngs = finalCoords.map(c => c[0]);
          const lats = finalCoords.map(c => c[1]);
          mapRef.current.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 100, duration: 2000 });
        }
      };
      processWaypoints();
    }
  }, [routeWaypoints]);

  const handleMapClick = async (event) => {
    if (isSaving || viewingRoute || isRecording) return;
    const { lng, lat } = event.lngLat;
    const newPoints = [...points, [lng, lat]];
    setPoints(newPoints);
    if (newPoints.length >= 2) fetchRoutes(newPoints);
  };

  const handleSaveRoute = async (details) => {
    if (!routeGeoJSON) return;
    const { error } = await supabase.from('routes').insert({
      name: details.name, vibe: details.vibe, surface: details.surface, path: routeGeoJSON.geometry, difficulty: 1, created_by: session?.user?.id 
    });
    if (error) alert('Error saving!');
    else { alert('Route Saved!'); setIsSaving(false); setPoints([]); setAllRoutes([]); if(onRouteOptionsUpdate) onRouteOptionsUpdate(null); setRecordedPath([]); }
  };

  const handleStartNavigationTo = (destCoords) => {
      navigator.geolocation.getCurrentPosition((pos) => {
          const currentLoc = [pos.coords.longitude, pos.coords.latitude];
          const newWaypoints = [currentLoc, destCoords];
          setPoints(newWaypoints);
          fetchRoutes(newWaypoints).then(() => startRecording(true));
      }, (err) => alert("Enable GPS to start navigation."));
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
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

        {isRecording && navSteps.length > 0 && <NavigationHUD instructions={navSteps} currentStepIndex={currentStepIndex} distanceToNext={distanceToNextStep} onStopNavigation={stopRecording} />}
        
        {allRoutes.map((r, i) => {
            if (i === selectedRouteIdx) return null; 
            return (
                <Source key={r.id} id={`alt-route-${r.id}`} type="geojson" data={{ type: 'Feature', geometry: r.geometry }}>
                    <Layer id={`alt-layer-${r.id}`} type="line" paint={{ 'line-color': '#52525b', 'line-width': 4, 'line-opacity': 0.5 }} />
                </Source>
            );
        })}

        {routeGeoJSON && !viewingRoute && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer id="route-layer" type="line" paint={{ 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.8 }} />
          </Source>
        )}

        {viewingRoute && viewingRoute.path && <Source id="view-route" type="geojson" data={{ type: 'Feature', geometry: viewingRoute.path }}><Layer id="view-route-layer" type="line" paint={{ 'line-color': '#a855f7', 'line-width': 5, 'line-opacity': 0.9 }} /></Source>}
        
        {Object.keys(otherRiders).map((key) => {
            const rider = otherRiders[key];
            return (
                <React.Fragment key={key}>
                    {rider.history && rider.history.length > 1 && <Source id={`trail-${key}`} type="geojson" data={{ type: 'Feature', geometry: { type: 'LineString', coordinates: rider.history }}}><Layer id={`trail-layer-${key}`} type="line" paint={{ 'line-color': '#06b6d4', 'line-width': 3, 'line-opacity': 0.6, 'line-blur': 1 }} /></Source>}
                    <Marker longitude={rider.lng} latitude={rider.lat}><div className="flex flex-col items-center transition-transform duration-500 ease-linear" style={{ transform: `rotate(${rider.heading || 0}deg)` }}><ArrowIcon size={28} fill="#a855f7" className="text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" /></div></Marker>
                </React.Fragment>
            );
        })}
        
        {points.map((p, i) => <Marker key={i} longitude={p[0]} latitude={p[1]} color={i === 0 ? "#4ade80" : "#ef4444"} />)}
        
        {isRecording && recordedPath.length > 1 && <Source id="recording-line" type="geojson" data={{ type: 'Feature', geometry: { type: 'LineString', coordinates: recordedPath.map(p=>[p.lng, p.lat]) }}}><Layer id="recording-layer" type="line" paint={{ 'line-color': '#ef4444', 'line-width': 4, 'line-opacity': 1, 'line-dasharray': [2, 1] }} /></Source>}
        
        {flyToLocation && <Marker longitude={flyToLocation.coords[0]} latitude={flyToLocation.coords[1]} color="white"><div className="animate-bounce text-2xl">📍</div></Marker>}
        
        {!isRecording && isRadarActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur rounded-full border border-zinc-700 shadow-xl z-50 animate-in slide-in-from-top-5">
            <div className={`w-2 h-2 rounded-full animate-pulse ${syncGroupName ? 'bg-purple-500' : 'bg-green-500'}`}></div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">{syncGroupName ? syncGroupName : 'PUBLIC GRID'}</span>
            {syncGroupName && <Shield size={12} className="text-purple-500" />}
          </div>
        )}

        {isRecording && navSteps.length === 0 && (
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

        <div className="absolute top-24 right-2 z-10 flex flex-col gap-2">
          <button onClick={() => setIsRadarActive(!isRadarActive)} className={`p-3 rounded-lg shadow-xl border border-zinc-700 transition-all ${isRadarActive ? 'bg-purple-600 text-white animate-pulse' : 'bg-black text-zinc-400'}`}>
            {isRadarActive ? <Radio size={20} className="animate-spin-slow" /> : <Users size={20} />}
          </button>
          <button onClick={toggleRecording} className={`p-3 rounded-lg shadow-xl border border-zinc-700 transition-all ${isRecording ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] scale-110' : 'bg-black text-zinc-400'}`}>
            {isRecording ? <Square size={20} fill="currentColor" /> : <Disc size={20} />}
          </button>
        </div>

        {isSaving && <RouteCreator initialVibe={allRoutes[selectedRouteIdx]?.stats.vibe.toLowerCase()} onSave={handleSaveRoute} onCancel={() => setIsSaving(false)} />}
      </Map>
    </div>
  );
}