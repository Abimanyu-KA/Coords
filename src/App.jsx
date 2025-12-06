import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MapBoard from './components/MapBoard';
import FeedPanel from './components/FeedPanel';
import SearchBox from './components/SearchBox';
import Auth from './components/Auth';
import ProfilePanel from './components/ProfilePanel';
import GroupPanel from './components/GroupPanel';
import PlaceCard from './components/PlaceCard';
// ⚡ FIX: Added 'User' to imports
import { Compass, User } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // App UI State
  const [showFeed, setShowFeed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSavingRoute, setIsSavingRoute] = useState(false); 
  
  // Map State
  const [flyToLocation, setFlyToLocation] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null); 
  const [routeWaypoints, setRouteWaypoints] = useState(null); 
  const [viewingRoute, setViewingRoute] = useState(null);
  
  const [currentRouteOptions, setCurrentRouteOptions] = useState(null);
  const [directNavDestination, setDirectNavDestination] = useState(null);
  const [triggerSaveRoute, setTriggerSaveRoute] = useState(false); 

  // Search Box Config
  const [searchInitialMode, setSearchInitialMode] = useState('single');
  const [searchInitialDest, setSearchInitialDest] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const [dbConnected, setDbConnected] = useState(false);

  // 1. Init Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    supabase.from('locations').select('count', { count: 'exact', head: true })
      .then(({ error }) => !error && setDbConnected(true));
    return () => subscription.unsubscribe();
  }, []);

  // ⚡ HARD RESET FUNCTION (Home Button)
  const handleResetApp = () => {
    console.log("🏠 Home Reset Triggered");
    
    // Fly to Current Location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFlyToLocation({ 
                    coords: [pos.coords.longitude, pos.coords.latitude], 
                    zoom: 15, 
                    showMarker: false 
                });
            }, 
            (err) => console.error("Reset GPS Error:", err),
            { enableHighAccuracy: true }
        );
    } else {
         // Fallback
         setFlyToLocation({ 
            coords: [80.2707, 13.0827], 
            zoom: 12, 
            showMarker: false 
        });
    }

    // Clear State
    setSelectedPlace(null);
    setRouteWaypoints(null);
    setViewingRoute(null);
    setCurrentRouteOptions(null);
    setDirectNavDestination(null);
    
    setSearchInitialMode('single');
    setSearchInitialDest(null);
    setResetKey(prev => prev + 1); 
    
    setShowFeed(false);
    setShowProfile(false);
    setShowGroups(false);
    setShowSearch(false);
    
    setIsNavigating(false); 
    setTriggerSaveRoute(false);
    setIsSavingRoute(false);
  };

  // Clear UI when Navigation Starts
  useEffect(() => {
    if (isNavigating) {
      setSelectedPlace(null);
      setCurrentRouteOptions(null);
      setShowSearch(false);
      setIsSavingRoute(false);
    }
  }, [isNavigating]);

  // Helper for viewing saved routes
  const handleViewSavedRoute = (route) => {
      setViewingRoute(route);
      setShowFeed(false);
      setCurrentRouteOptions({
          options: [{
              id: 0,
              tag: route.vibe === 'scenic' ? 'DRIFT' : route.vibe === 'twisty' ? 'DRIFT' : 'VECTOR',
              stats: { 
                  km: route.distance_km?.toFixed(1) || '?', 
                  mins: route.duration_mins || '?', 
                  sinuosity: '1.0', 
                  vibe: route.vibe 
              }
          }],
          selectedId: 0,
          onSelect: () => {} 
      });
  };

  if (loading) return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">Initializing...</div>;
  if (!session) return <Auth />;

  return (
    <div className="h-screen w-screen bg-black text-zinc-100 font-sans overflow-hidden relative selection:bg-green-500/30">
      
      <MapBoard 
        flyToLocation={flyToLocation} 
        routeWaypoints={routeWaypoints} 
        viewingRoute={viewingRoute}
        directNavDestination={directNavDestination}
        onNavigationStarted={() => setDirectNavDestination(null)}
        onRouteOptionsUpdate={(options) => setCurrentRouteOptions(options)}
        onNavigationActive={(isActive) => setIsNavigating(isActive)} 
        triggerSave={triggerSaveRoute}
        onSaveComplete={() => setTriggerSaveRoute(false)}
        
        // ⚡ Update isSavingRoute so we can hide the PlaceCard overlap
        onSavingChange={(isSaving) => setIsSavingRoute(isSaving)} 
        
        session={session}
      /> 

      {/* BRANDING */}
      <div className={`absolute z-20 transition-all duration-700 ease-in-out transform -translate-x-1/2 ${
          isNavigating 
            ? 'bottom-8 left-1/2 opacity-60 scale-75' 
            : 'top-6 left-1/2'
      }`}>
         <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/5 shadow-2xl ring-1 ring-white/5">
                <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                <h1 
                  className="text-lg font-black tracking-tighter text-white" 
                  style={{ fontFamily: '"Barlow", sans-serif' }}
                >
                  COORDS.
                </h1>
            </div>
            {!isNavigating && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>}
         </div>
      </div>

      {/* UI LAYER */}
      {!isNavigating && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between pb-24 z-10">
          <div className="pointer-events-auto mt-20 px-4 flex justify-center w-full"> 
            <SearchBox 
              key={resetKey}
              initialMode={searchInitialMode}
              initialDestination={searchInitialDest}
              defaultInputValue={selectedPlace?.name || ''} 
              onClose={() => setShowSearch(false)}
              onLocationSelect={(loc) => {
                setFlyToLocation(loc); 
                setSelectedPlace(loc); 
                setRouteWaypoints(null); 
                setViewingRoute(null);
                setCurrentRouteOptions(null);
              }}
              onRouteRequest={(waypoints) => {
                setRouteWaypoints(waypoints);
                setFlyToLocation(null); 
                setViewingRoute(null);
                setSelectedPlace(null);
              }}
              onClear={() => {
                setSearchInitialMode('single');
                setSearchInitialDest(null);
                setSelectedPlace(null);
                setFlyToLocation(null);
                setRouteWaypoints(null);
                setCurrentRouteOptions(null);
              }}
              onProfileClick={() => setShowProfile(true)}
              dbConnected={dbConnected}
            />
          </div>
        </div>
      )}

      {/* PROFILE BUTTON */}
      {!isNavigating && (
        <div className="absolute top-6 right-6 z-20 pointer-events-auto">
            <button 
                onClick={() => setShowProfile(true)}
                className="p-3 bg-black/40 backdrop-blur-xl rounded-full border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-2xl"
            >
                <User size={20} />
            </button>
        </div>
      )}

      {/* PLACE CARD - Hidden if Navigating OR Saving Route */}
      {/* ⚡ FIX: Added !isSavingRoute check to prevent overlap */}
      {!isNavigating && !isSavingRoute && (selectedPlace || currentRouteOptions) && (
        <div className="pointer-events-auto">
          <PlaceCard 
            place={selectedPlace}
            routeOptions={currentRouteOptions}
            onClose={() => {
                setSelectedPlace(null);
                setCurrentRouteOptions(null);
                setRouteWaypoints(null);
            }}
            
            onDirectionsClick={() => {
              setSearchInitialMode('route');
              setSearchInitialDest(selectedPlace);
              setShowSearch(true);    
              
              // Auto-trigger route calculation from Current Location
              setRouteWaypoints([
                  { text: 'Current Location', isCurrent: true },
                  { coords: selectedPlace.coords }
              ]);
              // Keep selectedPlace active so transition is smooth
            }}
            
            onStartNavigation={() => {
              if (currentRouteOptions) {
                 setDirectNavDestination({ coords: routeWaypoints[routeWaypoints.length-1].coords }); 
              } else {
                 setDirectNavDestination(selectedPlace);
              }
            }}
            onSaveRoute={() => setTriggerSaveRoute(true)}
          />
        </div>
      )}

      {/* PANELS & NAVBAR */}
      {/* ⚡ Logic: Navbar visible unless Navigating or Saving */}
      {!isNavigating && !isSavingRoute && (
        <>
          <FeedPanel isOpen={showFeed} onClose={() => setShowFeed(false)} onRouteSelect={handleViewSavedRoute} session={session} />
          <ProfilePanel isOpen={showProfile} onClose={() => setShowProfile(false)} session={session} />
          <GroupPanel isOpen={showGroups} onClose={() => setShowGroups(false)} session={session} />
          
          <Navbar 
            onFeedClick={() => setShowFeed(!showFeed)} 
            onGroupClick={() => setShowGroups(!showGroups)} 
            onHomeClick={handleResetApp} 
            isFeedOpen={showFeed} 
            isGroupOpen={showGroups} 
          />
        </>
      )}
    </div>
  );
}