import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Plus, Hash, X, Shield, Radio } from 'lucide-react';

export default function GroupPanel({ isOpen, onClose, session }) {
  const [activeTab, setActiveTab] = useState('my_groups'); // 'my_groups' | 'join' | 'create'
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form States
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (isOpen && session) {
      fetchMyGroups();
    }
  }, [isOpen, session]);

  const fetchMyGroups = async () => {
    setLoading(true);
    // Fetch groups I belong to
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups ( id, name, code, created_by )
      `)
      .eq('user_id', session.user.id);

    if (error) console.error(error);
    else setMyGroups(data.map(item => item.groups));
    setLoading(false);
  };

  const createGroup = async () => {
    if (!newGroupName) return;
    
    // Generate a simple 6-char code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 1. Create Group
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: newGroupName,
        code: code,
        created_by: session.user.id
      })
      .select()
      .single();

    if (error) {
      alert('Error creating group!');
      console.error(error);
      return;
    }

    // 2. Auto-join the creator
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: session.user.id
    });

    alert(`Sync Group "${group.name}" created! Code: ${group.code}`);
    setNewGroupName('');
    setActiveTab('my_groups');
    fetchMyGroups();
  };

  const joinGroup = async () => {
    if (!joinCode) return;

    // 1. Find group by code
    const { data: groups, error: searchError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('code', joinCode.toUpperCase())
      .limit(1);

    if (searchError || groups.length === 0) {
      alert('Invalid Sync Code!');
      return;
    }

    const group = groups[0];

    // 2. Join it
    const { error: joinError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: session.user.id
      });

    if (joinError) {
      if (joinError.code === '23505') alert('You are already synced with this group!');
      else alert('Failed to join.');
    } else {
      alert(`Synced with ${group.name} successfully!`);
      setJoinCode('');
      setActiveTab('my_groups');
      fetchMyGroups();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white tracking-tighter flex items-center gap-2">
            <Radio className="text-purple-500 animate-pulse" size={20} /> SYNC NET
          </h2>
          <button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button 
            onClick={() => setActiveTab('my_groups')}
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'my_groups' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Syncs
          </button>
          <button 
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'join' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Join
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'create' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Create
          </button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px]">
          
          {/* --- MY GROUPS TAB --- */}
          {activeTab === 'my_groups' && (
            <div className="space-y-3">
              {loading ? <p className="text-zinc-500">Scanning network...</p> : myGroups.length === 0 ? (
                <div className="text-center text-zinc-500 mt-10">
                  <Shield size={48} className="mx-auto mb-2 opacity-20" />
                  <p>No active syncs.</p>
                  <p className="text-xs">Join or create a Sync to share radar.</p>
                </div>
              ) : (
                myGroups.map(g => (
                  <div key={g.id} className="bg-black border border-zinc-800 p-4 rounded-xl flex justify-between items-center group hover:border-purple-500/50 transition-all">
                    <div>
                      <h3 className="font-bold text-white">{g.name}</h3>
                      <p className="text-xs text-zinc-500">Code: <span className="text-purple-400 font-mono tracking-wider">{g.code}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-1 rounded border border-zinc-800">ACTIVE</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* --- JOIN TAB --- */}
          {activeTab === 'join' && (
            <div className="space-y-4 mt-4">
              <p className="text-zinc-400 text-sm">Enter the 6-character secure code to sync with an existing group.</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-3 text-zinc-600" size={18} />
                  <input 
                    type="text" 
                    placeholder="ENTER CODE"
                    className="w-full bg-black border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-white font-mono uppercase focus:border-purple-500 outline-none"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <button onClick={joinGroup} className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200">
                Sync Up
              </button>
            </div>
          )}

          {/* --- CREATE TAB --- */}
          {activeTab === 'create' && (
            <div className="space-y-4 mt-4">
              <p className="text-zinc-400 text-sm">Initialize a new private network. You will receive a code to invite others.</p>
              <input 
                type="text" 
                placeholder="Group Name (e.g. Night Squad)"
                className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:border-purple-500 outline-none"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <button onClick={createGroup} className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
                <Plus size={18} /> Create Sync
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}