import React from 'react';
import { supabase } from '../supabaseClient';
import { LogOut, User, Shield, X, Map, Zap } from 'lucide-react';

export default function ProfilePanel({ isOpen, onClose, session }) {
  if (!isOpen || !session) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  // Extract username from email (simple version)
  const username = session.user.email.split('@')[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      ></div>

      {/* Main Card */}
      <div className="relative w-full max-w-sm bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Pattern */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-zinc-800/50 to-transparent"></div>
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center pt-12 pb-8 px-6 relative z-0">
          
          {/* Avatar Ring */}
          <div className="relative mb-4 group">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl group-hover:bg-green-500/40 transition-all duration-500"></div>
            <div className="w-24 h-24 bg-black rounded-full border-2 border-zinc-700 flex items-center justify-center relative z-10 shadow-xl">
              <User size={40} className="text-zinc-400" />
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-black rounded-full"></div>
          </div>

          {/* User Info */}
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">{username}</h2>
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-6">Rider ID: {session.user.id.slice(0, 8)}</p>

          {/* Stats Grid (Placeholder for future data) */}
          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            <div className="bg-black/40 border border-zinc-800 p-3 rounded-2xl flex flex-col items-center">
                <Map size={20} className="text-blue-400 mb-1" />
                <span className="text-lg font-bold text-white">0</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Routes</span>
            </div>
            <div className="bg-black/40 border border-zinc-800 p-3 rounded-2xl flex flex-col items-center">
                <Zap size={20} className="text-yellow-400 mb-1" />
                <span className="text-lg font-bold text-white">0.0</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">km Ridden</span>
            </div>
          </div>

          {/* Account Status */}
          <div className="w-full bg-zinc-800/30 border border-zinc-800/50 rounded-xl p-4 flex items-center gap-4 mb-6">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">System Online</p>
              <p className="text-xs text-zinc-500">Secure connection established.</p>
            </div>
          </div>

          {/* Logout Action */}
          <button 
            onClick={handleLogout}
            className="w-full py-3.5 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 active:scale-95 transition-all"
          >
            <LogOut size={18} />
            Disconnect
          </button>

        </div>
      </div>
    </div>
  );
}