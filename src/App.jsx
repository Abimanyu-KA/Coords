import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MapBoard from './components/MapBoard';
import FeedPanel from './components/FeedPanel';
import SearchBox from './components/SearchBox';
import Auth from './components/Auth';
import ProfilePanel from './components/ProfilePanel';
import { Search, Compass } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // App UI State
  const [showFeed, setShowFeed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  // Map State
  const [flyToLocation, setFlyToLocation] = useState(null);
  const [routeWaypoints, setRouteWaypoints] = useState(null); 
  const [viewingRoute, setViewingRoute] = useState(null); // <--- New State
  
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
    <div className="h-screen w-screen bg-black text-zinc-100 font-sans overflow-hidden relative">
      
      {/* 1. MAP LAYER */}
      <MapBoard 
        flyToLocation={flyToLocation} 
        routeWaypoints={routeWaypoints} 
        viewingRoute={viewingRoute} // <--- Pass the selected route to map
        session={session}
      /> 

      {/* 2. UI LAYER */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between pb-24 z-10">
        
        {!showSearch && (
          <header className="bg-black/80 backdrop-blur-md border-b border-zinc-900 px-4 py-4 pointer-events-auto">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSearch(true)}
                className="p-2 bg-zinc-900 rounded-full text-zinc-400 border border-zinc-800 hover:text-white"
              >
                <Search size={20} />
              </button>

              <Compass className={`text-white ${dbConnected ? 'animate-pulse' : ''}`} size={24} />
              <h1 className="text-xl font-bold tracking-tighter">COORDS.</h1>
              <div className="flex-1"></div>
            </div>
          </header>
        )}

        {showSearch && (
          <div className="pointer-events-auto">
            <SearchBox 
              onClose={() => setShowSearch(false)}
              onLocationSelect={(loc) => {
                setFlyToLocation(loc);
                setRouteWaypoints(null); 
                setViewingRoute(null); // Clear viewing route if searching
              }}
              onRouteRequest={(waypoints) => {
                setRouteWaypoints(waypoints);
                setFlyToLocation(null); 
                setViewingRoute(null);
              }}
            />
          </div>
        )}
      </div>

      <FeedPanel 
        isOpen={showFeed} 
        onClose={() => setShowFeed(false)}
        onRouteSelect={(route) => {
          setViewingRoute(route); // <--- Set the viewing route
          setFlyToLocation(null);
          setRouteWaypoints(null);
          setShowFeed(false); // Close panel
        }} 
      />
      
      <ProfilePanel 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
        session={session} 
      />

      <Navbar 
        onFeedClick={() => setShowFeed(!showFeed)} 
        onProfileClick={() => setShowProfile(!showProfile)} 
      />
    </div>
  );
}