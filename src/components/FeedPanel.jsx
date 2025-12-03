import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { MapPin, Wind, Navigation, X } from 'lucide-react';

export default function FeedPanel({ isOpen, onClose, onRouteSelect }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
    }
  }, [isOpen]);

  const fetchRoutes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching feed:', error);
    else setRoutes(data || []);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm pt-12 pb-24 overflow-y-auto">
      
      <div className="px-6 mb-6 flex justify-between items-center sticky top-0 pt-4 pb-2 bg-black/90 z-10">
        <h2 className="text-2xl font-bold text-white tracking-tighter">EXPLORE.</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-white p-2">
          <X size={24} />
        </button>
      </div>

      <div className="px-4 space-y-4">
        {loading ? (
          <p className="text-zinc-500 text-center mt-10">Scanning for signals...</p>
        ) : routes.length === 0 ? (
          <div className="text-center p-8 border border-zinc-800 rounded-xl bg-zinc-900/50">
            <Wind className="mx-auto text-zinc-600 mb-2" />
            <p className="text-zinc-400">No routes found nearby.</p>
          </div>
        ) : (
          routes.map((route) => (
            <div key={route.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl hover:border-zinc-600 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white">{route.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  route.vibe === 'twisty' ? 'bg-purple-500/20 text-purple-400' :
                  route.vibe === 'scenic' ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {route.vibe}
                </span>
              </div>
              
              <div className="flex gap-4 text-zinc-400 text-sm mb-4">
                <span className="flex items-center gap-1 capitalize"><Navigation size={14}/> {route.surface}</span>
                <span className="flex items-center gap-1"><MapPin size={14}/> Chennai</span>
              </div>

              <button 
                onClick={() => onRouteSelect(route)} // <--- This triggers the magic
                className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-all"
              >
                View on Map
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}