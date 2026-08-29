/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Wifi, Battery, Sparkles, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  simulatedTimeMs: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  simulatedTimeMs,
  soundEnabled,
  onToggleSound
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const simDate = new Date(simulatedTimeMs);
  const timeString = simDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-0 sm:p-4 font-sans selection:bg-teal-500 selection:text-white">
      {/* Device Shell Container */}
      <div 
        className={`w-full transition-all duration-300 relative bg-stone-900 shadow-2xl flex flex-col overflow-hidden ${
          isExpanded 
            ? 'max-w-4xl min-h-screen sm:min-h-[920px] sm:rounded-3xl sm:border sm:border-stone-800' 
            : 'max-w-[430px] min-h-screen sm:min-h-[890px] sm:h-[890px] sm:rounded-[40px] sm:border-[8px] sm:border-stone-800 sm:ring-1 sm:ring-stone-700/50'
        }`}
      >
        {/* Android Status Bar */}
        <div className="w-full bg-stone-900/95 backdrop-blur-md px-6 pt-3 pb-2 flex items-center justify-between z-30 text-stone-300 text-xs font-medium border-b border-stone-800/40 select-none">
          <div className="flex items-center space-x-2">
            <span className="font-semibold tracking-tight text-stone-200">{timeString}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800/50 font-mono">
              SIM
            </span>
          </div>

          {/* Camera Notch simulation */}
          <div className="hidden sm:flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-black border border-stone-800 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-stone-900"></div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button 
              onClick={onToggleSound} 
              className="text-stone-400 hover:text-stone-200 transition-colors"
              title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-stone-500" />}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:inline-block text-stone-400 hover:text-stone-200 transition-colors"
              title={isExpanded ? "Mobile frame view" : "Expanded view"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-mono">98%</span>
              <Battery className="w-4 h-3.5 text-emerald-400 fill-emerald-400/20" />
            </div>
          </div>
        </div>

        {/* Inner Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-stone-900 relative">
          {children}
        </div>

        {/* Android Gesture Bar */}
        <div className="w-full bg-stone-900 py-2 flex items-center justify-center pointer-events-none select-none">
          <div className="w-32 h-1 rounded-full bg-stone-600/70"></div>
        </div>
      </div>
    </div>
  );
};
