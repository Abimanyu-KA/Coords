import React from 'react';
import { supabase } from '../supabaseClient';
import { LogOut, User, Shield } from 'lucide-react';

export default function ProfilePanel({ isOpen, onClose, session }) {
  if (!isOpen || !session) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
          ✕
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-zinc-700">
            <User size={40} className="text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Rider Profile</h2>
          <p className="text-zinc-500 text-sm">{session.user.email}</p>
        </div>

        <div className="space-y-3">
          <div className="bg-black/50 p-4 rounded-xl flex items-center gap-3 border border-zinc-800/50">
            <Shield size={20} className="text-green-500" />
            <div>
              <p className="text-sm font-bold text-white">Status: Online</p>
              <p className="text-xs text-zinc-500">Secure connection established.</p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all mt-4"
          >
            <LogOut size={18} />
            Disconnect
          </button>
        </div>

      </div>
    </div>
  );
}