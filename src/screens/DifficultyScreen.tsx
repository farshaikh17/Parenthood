/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DifficultyMode, UnitSystem } from '../types';
import { ShieldAlert, Flame, Check, ArrowRight, ArrowLeft, Bell, Ruler } from 'lucide-react';

interface DifficultyScreenProps {
  onNext: (difficulty: DifficultyMode, nighttimeAlerts: boolean, unitSystem: UnitSystem) => void;
  onBack: () => void;
}

export const DifficultyScreen: React.FC<DifficultyScreenProps> = ({ onNext, onBack }) => {
  const [difficulty, setDifficulty] = useState<DifficultyMode>('realistic');
  const [nighttimeAlerts, setNighttimeAlerts] = useState<boolean>(false);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

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
            <h2 className="text-lg font-bold text-stone-100">How demanding should it be?</h2>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-stone-300 block">Difficulty</label>
          
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
              Demanding but manageable. Feeds, naps and crying follow the baby's own rhythm, which is not a fixed timetable.
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
                  <span className="text-[10px] text-rose-400 font-medium">For people who want the full picture</span>
                </div>
              </div>
              {difficulty === 'hardcore' && <Check className="w-5 h-5 text-rose-400" />}
            </div>
            <p className="mt-3 text-xs text-stone-400 leading-relaxed">
              More unpredictable. Feeds bunch up, settling takes longer, sleep breaks more often, and the nights are harder. Hard because babies are hard, not to annoy you.
            </p>
          </button>
        </div>

        {/* Nighttime Mode Disclosure */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-indigo-200">Night mode</span>
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
            Care runs in real time, so night is your real night. When on, the baby can wake between 10 PM and 7 AM and need you. Later versions may send real notifications during your night — only if you allow it. You can change this any time in Settings.
          </p>
          <p className="text-[10px] text-stone-400 italic">
            Right now, night wakings happen inside the app only. Nothing will buzz your phone while the app is closed.
          </p>
        </div>

        {/* Units */}
        <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
          <div className="flex items-center space-x-2">
            <Ruler className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-xs font-bold text-stone-200">Measurement units</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: 'imperial', label: 'Imperial', desc: 'lb / oz, inches, fl oz' },
              { v: 'metric', label: 'Metric', desc: 'kg / g, cm, ml' }
            ] as { v: UnitSystem; label: string; desc: string }[]).map(u => (
              <button
                key={u.v}
                type="button"
                onClick={() => setUnitSystem(u.v)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  unitSystem === u.v ? 'bg-teal-950 border-teal-500 text-teal-100' : 'bg-stone-900 border-stone-700 text-stone-400'
                }`}
              >
                <div className="text-xs font-bold">{u.label}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">{u.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6">
        <button
          onClick={() => onNext(difficulty, nighttimeAlerts, unitSystem)}
          className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-950/50"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
