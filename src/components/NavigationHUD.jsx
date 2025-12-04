import React from 'react';
import { ArrowUp, ArrowRight, ArrowLeft, MapPin, X, Navigation, CornerUpRight, CornerUpLeft } from 'lucide-react';

export default function NavigationHUD({ instructions, currentStepIndex, distanceToNext, onStopNavigation }) {
  if (!instructions || instructions.length === 0) return null;

  const step = instructions[currentStepIndex] || instructions[instructions.length - 1];
  const nextStep = instructions[currentStepIndex + 1];
  
  const getIcon = (text, size = 48) => {
    const t = text?.toLowerCase() || '';
    if (t.includes('left')) return <CornerUpLeft size={size} />;
    if (t.includes('right')) return <CornerUpRight size={size} />;
    if (t.includes('arrive') || t.includes('destination')) return <MapPin size={size} />;
    if (t.includes('uturn')) return <Navigation size={size} className="rotate-180" />;
    return <ArrowUp size={size} />;
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-50 flex flex-col gap-2 animate-in slide-in-from-top-5">
      
      {/* Primary Instruction Card */}
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Top Bar: Distance & Icon */}
        <div className="flex items-start p-4 pb-2">
           <div className="bg-green-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20 mt-1">
             {getIcon(step.maneuver.instruction, 32)}
           </div>
           <div className="flex-1 ml-4 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white tracking-tighter leading-none">
                  {distanceToNext < 1000 
                    ? Math.round(distanceToNext) 
                    : (distanceToNext / 1000).toFixed(1)}
                </span>
                <span className="text-xl text-zinc-500 font-bold uppercase">
                  {distanceToNext < 1000 ? 'm' : 'km'}
                </span>
              </div>
              <div className="text-lg font-bold text-zinc-200 leading-tight mt-1 line-clamp-2">
                {step.maneuver.instruction}
              </div>
           </div>
           <button 
            onClick={onStopNavigation}
            className="p-2 bg-zinc-800/50 rounded-full text-zinc-400 hover:text-white hover:bg-red-500/20 hover:text-red-500 transition-all -mr-1 -mt-1"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Decorative Progress Line */}
        <div className="h-1 w-full bg-zinc-800 mt-2">
          <div className="h-full bg-green-500 w-1/3 animate-pulse"></div>
        </div>
      </div>

      {/* Secondary Card: Next Step (Visual Preview) */}
      {nextStep && (
        <div className="mx-4 bg-black/80 backdrop-blur-md border border-zinc-800 rounded-xl p-3 flex items-center gap-4 shadow-lg transform -translate-y-1 -z-10">
          <div className="text-zinc-500">
             {getIcon(nextStep.maneuver.instruction, 20)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">THEN</p>
            <p className="text-sm font-medium text-zinc-300 truncate">
              {nextStep.maneuver.instruction}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}