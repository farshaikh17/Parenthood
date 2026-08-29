/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Home, 
  Activity, 
  Users, 
  History, 
  BookOpen, 
  Settings, 
  Play, 
  Pause, 
  FastForward,
  AlertCircle
} from 'lucide-react';
import { AppScreen, SimulationSettings } from '../types';

interface NavigationProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  unreadEventsCount: number;
  settings: SimulationSettings;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
  babyName?: string;
  ageDays?: number;
}

export const TopAppBar: React.FC<{
  title: string;
  babyName?: string;
  ageDays?: number;
  settings: SimulationSettings;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
}> = ({ title, babyName, ageDays, settings, onUpdateSettings }) => {
  const speeds = [
    { label: '1x', value: 1 },
    { label: '60x', value: 60 },
    { label: '300x', value: 300 }
  ];

  return (
    <header className="sticky top-0 z-20 bg-stone-900/90 backdrop-blur-md px-4 py-3 border-b border-stone-800 flex items-center justify-between">
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <h1 className="text-base font-semibold tracking-tight text-stone-100">{title}</h1>
          {babyName && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-200 border border-amber-800/40 font-medium">
              {babyName} • {ageDays === 0 ? 'Day 1' : `${ageDays}d old`}
            </span>
          )}
        </div>
      </div>

      {/* Simulation Speed Pill Controls */}
      <div className="flex items-center space-x-1.5 bg-stone-950 p-1 rounded-full border border-stone-800">
        <button
          onClick={() => onUpdateSettings({ isPaused: !settings.isPaused })}
          className={`p-1.5 rounded-full transition-colors ${
            settings.isPaused 
              ? 'bg-amber-600 text-white' 
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
          title={settings.isPaused ? "Resume simulation" : "Pause simulation"}
        >
          {settings.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        <div className="flex items-center">
          {speeds.map((s) => (
            <button
              key={s.value}
              onClick={() => onUpdateSettings({ timeSpeed: s.value, isPaused: false })}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition-all ${
                settings.timeSpeed === s.value && !settings.isPaused
                  ? 'bg-teal-600 text-white font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export const BottomNavigationBar: React.FC<NavigationProps> = ({
  currentScreen,
  onNavigate,
  unreadEventsCount
}) => {
  const navItems: { screen: AppScreen; label: string; icon: React.FC<{ className?: string }> }[] = [
    { screen: 'dashboard', label: 'Baby', icon: Home },
    { screen: 'needs_status', label: 'Needs', icon: Activity },
    { screen: 'parent_status', label: 'Parents', icon: Users },
    { screen: 'event_history', label: 'Timeline', icon: History },
    { screen: 'journal', label: 'Journal', icon: BookOpen },
    { screen: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="sticky bottom-0 z-20 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 px-2 py-2">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentScreen === item.screen;
          const Icon = item.icon;
          const isHistory = item.screen === 'event_history';

          return (
            <button
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all relative ${
                isActive 
                  ? 'text-teal-400 font-medium' 
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-teal-950/80 text-teal-300' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'text-teal-300 font-semibold' : 'text-stone-400'}`}>
                {item.label}
              </span>

              {isHistory && unreadEventsCount > 0 && (
                <span className="absolute top-0.5 right-2 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-md animate-pulse">
                  {unreadEventsCount > 9 ? '9+' : unreadEventsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
