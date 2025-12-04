import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MapBoard from './components/MapBoard';
import FeedPanel from './components/FeedPanel';
import SearchBox from './components/SearchBox';
import Auth from './components/Auth';
import ProfilePanel from './components/ProfilePanel';
import GroupPanel from './components/GroupPanel';
import PlaceCard from './components/PlaceCard';
import { Compass } from 'lucide-react';
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
  
  // Map State
  const [flyToLocation, setFlyToLocation] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null); 
  const [routeWaypoints, setRouteWaypoints] = useState(null); 
  const [viewingRoute, setViewingRoute] = useState(null);
  
  // Using Route Options instead of single stats
  const [currentRouteOptions, setCurrentRouteOptions] = useState(null);
  
  const [directNavDestination, setDirectNavDestination] = useState(null);
  
  // Search Box Config
  const [searchInitialMode, setSearchInitialMode] = useState('single');
  const [searchInitialDest, setSearchInitialDest] = useState(null);

  const [dbConnected, setDbConnected] = useState(false);

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

  if (loading) return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">Initializing...</div>;
  if (!session) return <Auth />;

  return (
    <div className="h-screen w-screen bg-black text-zinc-100 font-sans overflow-hidden relative selection:bg-green-500/30">
      
      {/* 1. MAP LAYER */}
      <MapBoard 
        flyToLocation={flyToLocation} 
        routeWaypoints={routeWaypoints} 
        viewingRoute={viewingRoute}
        directNavDestination={directNavDestination}
        onNavigationStarted={() => setDirectNavDestination(null)}
        
        // Updated: Capture multiple options
        onRouteOptionsUpdate={(options) => setCurrentRouteOptions(options)}
        
        onNavigationActive={(isActive) => setIsNavigating(isActive)} 
        session={session}
      /> 

      {/* 2. BRANDING & STATUS BAR */}
      {/* Moves out of the way when navigating */}
      <div className={`absolute z-20 transition-all duration-700 ease-in-out ${
          isNavigating ? 'bottom-8 left-4 opacity-60 scale-75' : 'top-6 left-6'
      }`}>
         <div className="flex items-center gap-3">
            {/* Logo Pill */}
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/5 shadow-2xl ring-1 ring-white/5">
                <Compass className={`text-white w-5 h-5 ${dbConnected ? 'animate-pulse text-green-400' : ''}`} />
                <h1 className="text-base font-black tracking-tighter text-white">COORDS.</h1>
            </div>
            
            {/* Online Status Dot (Only when not navigating) */}
            {!isNavigating && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
            )}
         </div>
      </div>

      {/* 3. UI LAYER (Hidden when Navigating) */}
      {!isNavigating && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between pb-24 z-10">
          
          {/* SEARCH OVERLAY - Pushed down slightly to clear branding */}
          <div className="pointer-events-auto mt-20 px-4 flex justify-center w-full"> 
            <SearchBox 
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

      {/* PLACE CARD */}
      {!isNavigating && (selectedPlace || currentRouteOptions) && (
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
              setSelectedPlace(null); 
              setShowSearch(true);    
            }}
            onStartNavigation={() => {
              if (currentRouteOptions) {
                 // Start nav to destination of selected route
                 // (Logic simplified for now, assumes destination is same for all)
                 setDirectNavDestination({ coords: routeWaypoints[routeWaypoints.length-1].coords }); 
              } else {
                 setDirectNavDestination(selectedPlace);
              }
              setSelectedPlace(null);
              setCurrentRouteOptions(null);
            }}
          />
        </div>
      )}

      {/* PANELS & NAVBAR */}
      {!isNavigating && (
        <>
          <FeedPanel isOpen={showFeed} onClose={() => setShowFeed(false)} onRouteSelect={(route) => { setViewingRoute(route); setShowFeed(false); }} />
          <ProfilePanel isOpen={showProfile} onClose={() => setShowProfile(false)} session={session} />
          <GroupPanel isOpen={showGroups} onClose={() => setShowGroups(false)} session={session} />
          
          <Navbar 
            onFeedClick={() => setShowFeed(!showFeed)} 
            onGroupClick={() => setShowGroups(!showGroups)}
            isFeedOpen={showFeed}
            isGroupOpen={showGroups}
          />
        </>
      )}
    </div>
  );
}