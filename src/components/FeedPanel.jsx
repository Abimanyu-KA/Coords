import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { MapPin, Wind, Navigation, X, Compass, History, Bookmark } from 'lucide-react';

export default function FeedPanel({ isOpen, onClose, onRouteSelect, session }) {
  const [activeTab, setActiveTab] = useState('explore'); // explore | recordings | saved
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
    }
  }, [isOpen, activeTab]);

  const fetchRoutes = async () => {
    setLoading(true);
    setRoutes([]); 
    
    try {
        if (!session?.user) {
             setLoading(false); return;
        }

        // 1. SAVED TAB (Bookmarks + My Planned Routes)
        if (activeTab === 'saved') {
            // A. Fetch Bookmarks (Saved from Explore)
            const { data: bookmarks, error: bmError } = await supabase
                .from('saved_routes')
                .select(`
                    route_id,
                    routes (*)
                `)
                .eq('user_id', session.user.id);
            if (bmError) throw bmError;

            // B. Fetch My Planned Routes (Created but not recorded/ridden)
            // Logic: If max_speed is 0 or null, it's likely a planned route, not a recording
            const { data: myPlanned, error: plError } = await supabase
                .from('routes')
                .select('*')
                .eq('created_by', session.user.id)
                .or('max_speed.eq.0,max_speed.is.null'); // 0 or null = Planned
            if (plError) throw plError;

            // C. Merge
            const bookmarkedRoutes = bookmarks?.map(item => item.routes).filter(r => r !== null) || [];
            const plannedRoutes = myPlanned || [];
            
            // Deduplicate by ID
            const combinedMap = new Map();
            bookmarkedRoutes.forEach(r => combinedMap.set(r.id, r));
            plannedRoutes.forEach(r => combinedMap.set(r.id, r));
            
            const uniqueRoutes = Array.from(combinedMap.values());
            uniqueRoutes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            setRoutes(uniqueRoutes);
        
        // 2. MY RIDES (Strictly My Recordings)
        } else if (activeTab === 'recordings') {
            const { data, error } = await supabase
                .from('routes')
                .select('*')
                .eq('created_by', session.user.id)
                .gt('max_speed', 0) // Only routes with speed data (Real Recordings)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRoutes(data || []);

        // 3. EXPLORE (Strictly Admin/System Routes)
        } else {
            const { data, error } = await supabase
                .from('routes')
                .select('*')
                .is('created_by', null) // Only show routes with NO creator (System/Admin)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRoutes(data || []);
        }

    } catch (error) {
        console.error('Error fetching feed:', error);
    } finally {
        setLoading(false);
    }
  };

  // Handle Bookmark Toggle
  const handleBookmark = async (e, routeId) => {
      e.stopPropagation();
      if (!session) return alert("Login to save routes");

      const { error } = await supabase.from('saved_routes').insert({
          user_id: session.user.id,
          route_id: routeId
      });
      
      if (error) {
          if (error.code === '23505') {
             // Already saved -> Toggle OFF (Remove)
             await supabase.from('saved_routes').delete().match({ user_id: session.user.id, route_id: routeId });
             alert("Removed from Saved");
             if(activeTab === 'saved') fetchRoutes(); 
          } else {
             alert("Error saving route");
          }
      } else {
          alert("Route Saved!");
          if(activeTab === 'saved') fetchRoutes();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col animate-in slide-in-from-bottom-10">
      
      {/* Header & Tabs */}
      <div className="px-6 pt-6 pb-2 bg-black/80 z-10 border-b border-zinc-800/50">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-white tracking-tighter">LIBRARY</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-white p-2 bg-zinc-900 rounded-full">
            <X size={20} />
            </button>
        </div>

        <div className="flex gap-6 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setActiveTab('explore')}
                className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'explore' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                <Compass size={16} /> Explore
            </button>
            <button 
                onClick={() => setActiveTab('recordings')}
                className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'recordings' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                <History size={16} /> My Rides
            </button>
            <button 
                onClick={() => setActiveTab('saved')}
                className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'saved' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                <Bookmark size={16} /> Saved
            </button>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {loading ? (
          <div className="text-zinc-500 text-center mt-10 flex flex-col items-center animate-pulse">
             <Compass className="mb-2 animate-spin-slow" />
             <span>Syncing database...</span>
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center p-10 border border-zinc-800 border-dashed rounded-3xl mt-4 bg-zinc-900/20">
            <Wind className="mx-auto text-zinc-700 mb-3" size={48} />
            <p className="text-zinc-500 font-bold">No routes found.</p>
            <p className="text-zinc-600 text-xs mt-1">
                {activeTab === 'recordings' ? "You haven't recorded any rides yet." : 
                 activeTab === 'saved' ? "Bookmark routes or Save planned routes to see them here." : 
                 "No system routes available."}
            </p>
          </div>
        ) : (
          routes.map((route) => (
            <div key={route.id} className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl hover:border-zinc-600 transition-all group relative">
              
              {/* Bookmark Button */}
              <button 
                onClick={(e) => handleBookmark(e, route.id)}
                className={`absolute top-4 right-4 p-2 rounded-full transition-all z-10 ${
                    activeTab === 'saved' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <Bookmark size={16} fill={activeTab === 'saved' ? "currentColor" : "none"} />
              </button>

              <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{route.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{route.description || 'Route'}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                  route.vibe === 'Twisty' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                  route.vibe === 'scenic' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {route.vibe}
                </span>
              </div>
              
              <div className="flex gap-4 text-zinc-400 text-xs mb-5 font-mono">
                <span className="flex items-center gap-1.5"><Navigation size={12}/> {route.distance_km || '?'} km</span>
                <span className="flex items-center gap-1.5"><MapPin size={12}/> Chennai</span>
                {route.difficulty && <span className="flex items-center gap-1.5 text-yellow-500">★ {route.difficulty}</span>}
              </div>

              <button 
                onClick={() => onRouteSelect(route)} 
                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Compass size={16} /> View on Map
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}