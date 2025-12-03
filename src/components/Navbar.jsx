import React from 'react';
import { Map, List, Shield } from 'lucide-react';

export default function Navbar({ onFeedClick, onGroupClick }) {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-md border-t border-zinc-800 pb-6 pt-3 px-6 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        
        {/* Feed Tab */}
        <button 
          onClick={onFeedClick}
          className="flex flex-col items-center text-zinc-500 hover:text-white transition-colors"
        >
          <List size={24} />
          <span className="text-[10px] mt-1 font-medium tracking-wider uppercase">Feed</span>
        </button>

        {/* Map Tab (Center) */}
        <button className="flex flex-col items-center text-white -mt-6">
          <div className="bg-white text-black p-4 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] border-4 border-black">
            <Map size={24} />
          </div>
        </button>

        {/* Sync Tab (Replaces Profile) */}
        <button 
          onClick={onGroupClick}
          className="flex flex-col items-center text-zinc-500 hover:text-white transition-colors"
        >
          <Shield size={24} />
          <span className="text-[10px] mt-1 font-medium tracking-wider uppercase">Sync</span>
        </button>

      </div>
    </div>
  );
}