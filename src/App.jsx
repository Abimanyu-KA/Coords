import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MapBoard from './components/MapBoard';
import FeedPanel from './components/FeedPanel';
import SearchBox from './components/SearchBox';
import Auth from './components/Auth';
import ProfilePanel from './components/ProfilePanel';
import GroupPanel from './components/GroupPanel';
import { Search, Compass, User } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // App UI State
  const [showFeed, setShowFeed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  
  // Map State
  const [flyToLocation, setFlyToLocation] = useState(null);
  const [routeWaypoints, setRouteWaypoints] = useState(null); 
  const [viewingRoute, setViewingRoute] = useState(null);
  
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Check DB connection
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
        viewingRoute={viewingRoute}
        session={session}
      /> 

      {/* 2. UI LAYER */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between pb-24 z-10">
        
        {!showSearch && (
          <header className="bg-black/80 backdrop-blur-md border-b border-zinc-900 px-4 py-4 pointer-events-auto">
            <div className="flex items-center justify-between">
              
              {/* Left: Search & Compass */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowSearch(true)}
                  className="p-2 bg-zinc-900 rounded-full text-zinc-400 border border-zinc-800 hover:text-white"
                >
                  <Search size={20} />
                </button>
                <Compass className={`text-white ${dbConnected ? 'animate-pulse' : ''}`} size={24} />
                <h1 className="text-xl font-bold tracking-tighter">COORDS.</h1>
              </div>

              {/* Right: Profile Button */}
              <button 
                onClick={() => setShowProfile(true)}
                className="p-2 bg-zinc-900 rounded-full text-zinc-400 border border-zinc-800 hover:text-white"
              >
                <User size={20} />
              </button>

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
                setViewingRoute(null);
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

      {/* PANELS */}
      <FeedPanel 
        isOpen={showFeed} 
        onClose={() => setShowFeed(false)}
        onRouteSelect={(route) => {
          setViewingRoute(route);
          setFlyToLocation(null);
          setRouteWaypoints(null);
          setShowFeed(false);
        }} 
      />
      
      <ProfilePanel 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
        session={session} 
      />

      <GroupPanel 
        isOpen={showGroups} 
        onClose={() => setShowGroups(false)} 
        session={session} 
      />

      {/* NAVBAR */}
      <Navbar 
        onFeedClick={() => setShowFeed(!showFeed)} 
        onGroupClick={() => setShowGroups(!showGroups)} 
      />
    </div>
  );
}