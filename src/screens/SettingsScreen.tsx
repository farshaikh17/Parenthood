/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SimulationSettings, UnitSystem } from '../types';
import { DISCLAIMER_LONG } from '../content/copy';
import { 
  Settings as SettingsIcon, 
  ShieldAlert, 
  Flame, 
  Bell, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Info, 
  Clock, 
  Ruler,
  Zap
} from 'lucide-react';

interface SettingsScreenProps {
  settings: SimulationSettings;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
  onResetSimulation: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onResetSimulation
}) => {
  return (
    <div className="flex-1 p-4 space-y-4 text-stone-100 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-stone-800/80 to-stone-900/90 border border-stone-700/60 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 font-mono">Settings</span>
          <h2 className="text-base font-bold text-stone-100 mt-0.5">Settings</h2>
          <p className="text-xs text-stone-400">
            Version <span className="text-teal-300 font-medium">1.1 (M1)</span>
          </p>
        </div>

        <div className="p-2.5 rounded-2xl bg-stone-950/60 border border-stone-800 text-teal-400">
          <SettingsIcon className="w-5 h-5" />
        </div>
      </div>

      {/* Units */}
      <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-stone-200">
          <Ruler className="w-4 h-4 text-teal-400" />
          <span>Measurement units</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: 'imperial', label: 'Imperial', desc: 'lb / oz, in, fl oz' },
            { v: 'metric', label: 'Metric', desc: 'kg / g, cm, ml' }
          ] as { v: UnitSystem; label: string; desc: string }[]).map(u => (
            <button
              key={u.v}
              onClick={() => onUpdateSettings({ unitSystem: u.v })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.unitSystem === u.v ? 'bg-teal-950 border-teal-500 text-teal-100 font-semibold' : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
            >
              <div className="text-xs font-bold">{u.label}</div>
              <div className="text-[10px] text-stone-400 mt-1">{u.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Away policy */}
      <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-stone-200">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>While the app is closed</span>
          </div>
          <input
            type="checkbox"
            checked={settings.awayAutopilotEnabled}
            onChange={(e) => onUpdateSettings({ awayAutopilotEnabled: e.target.checked })}
            className="accent-teal-500 w-4 h-4 rounded cursor-pointer"
          />
        </div>
        <p className="text-[11px] text-stone-400 leading-relaxed">
          The baby keeps living while you're away. With this on, basic care (feeds, changes, burps, settling) is covered by a simulated caregiver — slowly, and never the last stretch before you return. Everything it does is logged in the Timeline. Turn it off and nobody looks after the baby while you're gone.
        </p>
      </div>

      {/* Testing controls (developer mode only) */}
      {settings.developerMode && (
      <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-stone-200">
          <Clock className="w-4 h-4 text-teal-400" />
          <span>Testing: simulation speed</span>
        </div>
        <p className="text-[11px] text-stone-400 leading-relaxed">
          For testing only. The real journey will use a fixed, disclosed schedule (M2).
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: '1x (Real Time)', value: 1, desc: '1s = 1s' },
            { label: '60x (Fast)', value: 60, desc: '1m = 1h' },
            { label: '300x (Rapid)', value: 300, desc: '1m = 5h' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => onUpdateSettings({ timeSpeed: item.value, isPaused: false })}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                settings.timeSpeed === item.value && !settings.isPaused
                  ? 'bg-teal-950 border-teal-500 text-teal-200 font-bold'
                  : 'bg-stone-900 border-stone-700 text-stone-400 hover:bg-stone-850'
              }`}
            >
              <div className="text-xs">{item.label}</div>
              <div className="text-[9px] text-stone-500 font-mono mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Section 2: Difficulty Selection */}
      <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-stone-200">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Difficulty Mode</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onUpdateSettings({ difficulty: 'realistic' })}
            className={`p-3 rounded-xl border text-left transition-all ${
              settings.difficulty === 'realistic'
                ? 'bg-teal-950 border-teal-500 text-teal-100 font-semibold'
                : 'bg-stone-900 border-stone-700 text-stone-400'
            }`}
          >
            <div className="text-xs font-bold">Realistic</div>
            <div className="text-[10px] text-stone-400 mt-1">Demanding but manageable</div>
          </button>

          <button
            onClick={() => onUpdateSettings({ difficulty: 'hardcore' })}
            className={`p-3 rounded-xl border text-left transition-all ${
              settings.difficulty === 'hardcore'
                ? 'bg-rose-950 border-rose-500 text-rose-100 font-semibold'
                : 'bg-stone-900 border-stone-700 text-stone-400'
            }`}
          >
            <div className="text-xs font-bold">Hardcore</div>
            <div className="text-[10px] text-stone-400 mt-1">Harder nights, less predictable</div>
          </button>
        </div>
      </div>

      {/* Section 3: Nighttime Simulation Disclosure */}
      <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-200">Night mode</span>
          </div>
          <input
            type="checkbox"
            checked={settings.nighttimeAlertsEnabled}
            onChange={(e) => onUpdateSettings({ nighttimeAlertsEnabled: e.target.checked })}
            className="accent-indigo-500 w-4 h-4 rounded cursor-pointer"
          />
        </div>
        <p className="text-[11px] text-stone-300 leading-relaxed">
          The baby wakes during simulated night hours ({settings.nighttimeQuietStartHour}:00–{settings.nighttimeQuietEndHour}:00) and needs you.
        </p>
        
        {/* Notice & Disclosure */}
        <div className="p-2.5 rounded-xl bg-stone-950/70 border border-indigo-900/50 flex items-start space-x-2 text-[11px] text-stone-300 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-indigo-200 font-semibold">Right now:</strong> night wakings happen inside the app only. Nothing will notify or wake you while the app is closed. Real notifications are a planned, opt-in feature.
          </span>
        </div>
      </div>

      {/* Section 4: Audio Cues Toggle */}
      <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-stone-200">
            {settings.soundEffectsEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
            <span>Sounds</span>
          </div>
          <p className="text-[10px] text-stone-400">Chimes, coos and alert tones</p>
        </div>
        <input
          type="checkbox"
          checked={settings.soundEffectsEnabled}
          onChange={(e) => onUpdateSettings({ soundEffectsEnabled: e.target.checked })}
          className="accent-teal-500 w-4 h-4 rounded cursor-pointer"
        />
      </div>

      {/* Section 5: Reset Simulation */}
      <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-rose-300">
          <RotateCcw className="w-4 h-4" />
          <span>Delete this simulation</span>
        </div>
        <p className="text-[11px] text-stone-400">
          Deletes the baby, parents, timeline and journal stored on this device and starts over. Data is stored only on this device; the journal text is sent to an AI service when you ask for an entry.
        </p>
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to reset this baby simulation and start over?")) {
              onResetSimulation();
            }
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-100 font-semibold text-xs border border-rose-700"
        >
          Delete and start over
        </button>
      </div>

      {/* Developer mode */}
      <div className="p-4 rounded-2xl bg-stone-800/20 border border-stone-800 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-stone-400">
            <Zap className="w-4 h-4 text-stone-500" />
            <span>Developer mode</span>
          </div>
          <p className="text-[10px] text-stone-500">Shows testing controls (speed, pause).</p>
        </div>
        <input
          type="checkbox"
          checked={settings.developerMode}
          onChange={(e) => onUpdateSettings({ developerMode: e.target.checked })}
          className="accent-stone-500 w-4 h-4 rounded cursor-pointer"
        />
      </div>

      {/* About & disclaimer */}
      <div className="pt-2 pb-4 text-[10px] text-stone-500 space-y-2 px-1">
        <p className="font-semibold text-stone-400 text-center">Parenthood</p>
        <p className="leading-relaxed">{DISCLAIMER_LONG}</p>
      </div>

    </div>
  );
};
