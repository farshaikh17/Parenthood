/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DifficultyMode } from '../types';
import { ShieldAlert, Flame, Check, ArrowRight, ArrowLeft, Bell } from 'lucide-react';

interface DifficultyScreenProps {
  onNext: (difficulty: DifficultyMode, nighttimeAlerts: boolean) => void;
  onBack: () => void;
}

export const DifficultyScreen: React.FC<DifficultyScreenProps> = ({ onNext, onBack }) => {
  const [difficulty, setDifficulty] = useState<DifficultyMode>('realistic');
  const [nighttimeAlerts, setNighttimeAlerts] = useState<boolean>(false);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-stone-900 text-stone-100 animate-in fade-in duration-200 overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-teal-400 font-bold font-mono">Step 3 of 4</span>
            <h2 className="text-lg font-bold text-stone-100">Simulation Realism</h2>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-stone-300 block">Choose Simulation Rigor</label>
          
          <button
            type="button"
            onClick={() => setDifficulty('realistic')}
            className={`w-full p-4 rounded-2xl border text-left transition-all relative ${
              difficulty === 'realistic'
                ? 'bg-teal-950/60 border-teal-500 ring-1 ring-teal-500/50'
                : 'bg-stone-800/40 border-stone-700/50 hover:bg-stone-800/70'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-900/60 text-teal-300 border border-teal-700">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-100">Realistic</h3>
                  <span className="text-[10px] text-teal-400 font-medium">Recommended for most users</span>
                </div>
              </div>
              {difficulty === 'realistic' && <Check className="w-5 h-5 text-teal-400" />}
            </div>
            <p className="mt-3 text-xs text-stone-400 leading-relaxed">
              Demanding but balanced newborn care. Follows standard 2-3 hour feeding cycles, predictable wake windows, and standard soothing response curves.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setDifficulty('hardcore')}
            className={`w-full p-4 rounded-2xl border text-left transition-all relative ${
              difficulty === 'hardcore'
                ? 'bg-rose-950/60 border-rose-500 ring-1 ring-rose-500/50'
                : 'bg-stone-800/40 border-stone-700/50 hover:bg-stone-800/70'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-900/60 text-rose-300 border border-rose-700">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-100">Hardcore</h3>
                  <span className="text-[10px] text-rose-400 font-medium">High disruption mode</span>
                </div>
              </div>
              {difficulty === 'hardcore' && <Check className="w-5 h-5 text-rose-400" />}
            </div>
            <p className="mt-3 text-xs text-stone-400 leading-relaxed">
              Maximum parental endurance test. Includes frequent cluster feedings, spontaneous gas/colic spells, unpredictable sleep fragmentation, and overtired meltdowns.
            </p>
          </button>
        </div>

        {/* Nighttime Mode Disclosure */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-indigo-200">Nighttime Awakening Simulation</span>
            </div>
            <input
              type="checkbox"
              id="nighttime-toggle"
              checked={nighttimeAlerts}
              onChange={(e) => setNighttimeAlerts(e.target.checked)}
              className="accent-indigo-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-stone-300 leading-relaxed">
            When enabled, the simulation generates occasional nighttime waking events (10 PM - 7 AM simulated hours) representing authentic sleep fragmentation.
          </p>
          <p className="text-[10px] text-stone-400 italic">
            Note: In this V1 prototype, nighttime events occur within the simulation clock and can be observed at 60x/300x speed without waking your real phone.
          </p>
        </div>
      </div>

      <div className="pt-6">
        <button
          onClick={() => onNext(difficulty, nighttimeAlerts)}
          className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-950/50"
        >
          <span>Continue to Baby Creation</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
