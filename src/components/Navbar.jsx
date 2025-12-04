import React from 'react';
import { Map, List, Shield } from 'lucide-react';

export default function Navbar({ onFeedClick, onGroupClick, onHomeClick, isFeedOpen, isGroupOpen }) {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/95 to-transparent pb-8 pt-12 px-6 z-50 pointer-events-none">
      <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/5 rounded-full shadow-2xl shadow-black/50 max-w-xs mx-auto flex justify-between items-center px-2 py-2 pointer-events-auto">
        
        <button 
          onClick={onFeedClick}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            isFeedOpen ? 'text-white scale-110' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className={`p-1 rounded-full transition-all duration-300 ${
             isFeedOpen ? 'bg-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : ''
          }`}>
             <List size={24} strokeWidth={2.5} />
          </div>
          <span className={`text-[9px] font-bold tracking-widest uppercase ${
            isFeedOpen ? 'text-white opacity-100' : 'text-zinc-600 opacity-0 -mb-3'
          } transition-all duration-300`}>
            Feed
          </span>
        </button>

        {/* Center Map Button (Home) */}
        <div className="relative -top-8 group">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all duration-500"></div>
          
          <button 
            onClick={onHomeClick} // ⚡ WIRED CORRECTLY
            className="relative bg-white text-black w-16 h-16 rounded-full flex items-center justify-center shadow-xl shadow-black/50 border-4 border-black/50 transform transition-transform duration-300 group-hover:scale-110 group-active:scale-95"
          >
            <Map size={28} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-500" />
          </button>
        </div>

        <button 
          onClick={onGroupClick}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            isGroupOpen ? 'text-purple-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className={`p-1 rounded-full transition-all duration-300 ${
             isGroupOpen ? 'bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : ''
          }`}>
            <Shield size={24} strokeWidth={2.5} />
          </div>
          <span className={`text-[9px] font-bold tracking-widest uppercase ${
            isGroupOpen ? 'text-purple-400 opacity-100' : 'text-zinc-600 opacity-0 -mb-3'
          } transition-all duration-300`}>
            Sync
          </span>
        </button>

      </div>
    </div>
  );
}