import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

export default function RouteCreator({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [vibe, setVibe] = useState('scenic');
  const [surface, setSurface] = useState('tarmac');

  return (
    <div className="absolute bottom-24 left-4 right-4 bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-10">
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold">New Route Details</h3>
        <button onClick={onCancel} className="text-zinc-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {/* Name Input */}
        <input
          type="text"
          placeholder="Route Name (e.g. ECR Sunrise)"
          className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex gap-2">
          {/* Vibe Selector */}
          <select 
            value={vibe} 
            onChange={(e) => setVibe(e.target.value)}
            className="flex-1 bg-black border border-zinc-700 rounded-lg p-3 text-white outline-none"
          >
            <option value="scenic">Scenic</option>
            <option value="twisty">Twisty</option>
            <option value="straight">Straight</option>
          </select>

          {/* Surface Selector */}
          <select 
            value={surface} 
            onChange={(e) => setSurface(e.target.value)}
            className="flex-1 bg-black border border-zinc-700 rounded-lg p-3 text-white outline-none"
          >
            <option value="tarmac">Tarmac</option>
            <option value="gravel">Gravel</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        {/* Save Button */}
        <button 
          onClick={() => onSave({ name, vibe, surface })}
          className="w-full bg-white text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-200"
        >
          <Save size={18} />
          Save Route
        </button>
      </div>
    </div>
  );
}