/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Baby, 
  BabyState, 
  CareActionRecord, 
  Parent, 
  ScoreReport, 
  SimulationEvent, 
  SimulationSettings, 
  UserProfile 
} from '../types';
import { 
  Droplet, 
  Wind, 
  Sparkles, 
  Moon, 
  Heart, 
  Coffee, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Clock, 
  Users, 
  Smile, 
  Frown, 
  Info,
  ChevronRight,
  ShieldAlert,
  Flame,
  Utensils
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { getDevelopmentalStage, isNighttimeHour } from '../simulation/engine';
import { formatLength, formatWeight } from '../utils/units';
import { formatDevelopmentalAge, getCareDayNumber, getDevelopmentalAgeDays } from '../simulation/clock';
import { describeBaby, preferredCaregiver } from '../simulation/personality';

interface DashboardScreenProps {
  baby: Baby;
  babyState: BabyState;
  parents: Parent[];
  userProfile: UserProfile;
  settings: SimulationSettings;
  scoreReport: ScoreReport;
  recentEvents: SimulationEvent[];
  onOpenActionModal: (actionType: string) => void;
  onSwitchActiveParent: (parentId: string) => void;
  onResolveEvent: (eventId: string) => void;
  onNavigate: (screen: any) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  baby,
  babyState,
  parents,
  userProfile,
  settings,
  scoreReport,
  recentEvents,
  onOpenActionModal,
  onSwitchActiveParent,
  onResolveEvent,
  onNavigate
}) => {
  const activeParent = parents.find(p => p.id === userProfile.activeParentId) || parents[0];
  const otherParent = parents.find(p => p.id !== userProfile.activeParentId);

  const ageDays = getDevelopmentalAgeDays(baby);
  const careDay = getCareDayNumber(baby, settings);
  const stage = getDevelopmentalStage(ageDays);
  const simDate = new Date(settings.simulatedTimeMs);
  const timeString = simDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isNight = isNighttimeHour(simDate.getHours(), settings);

  // Active unaddressed warnings or emergencies
  const activeUnresolvedEvent = recentEvents.find(e => !e.resolved);
  const awaySummary = recentEvents.length > 0 && recentEvents[0].type === 'away_summary' ? recentEvents[0] : null;

  // Time calculations
  const minutesSinceFeed = Math.floor((settings.simulatedTimeMs - babyState.lastFedTimestamp) / (60 * 1000));
  const minutesSinceDiaper = Math.floor((settings.simulatedTimeMs - babyState.lastDiaperTimestamp) / (60 * 1000));

  // Mood configuration
  const getMoodVisual = () => {
    switch (babyState.mood) {
      case 'sleeping_deep':
        return {
          label: 'Sleeping Soundly',
          color: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
          avatarEmoji: '😴',
          desc: 'Resting peacefully.'
        };
      case 'sleeping_light':
        return {
          label: 'Light Sleep / Stirring',
          color: 'bg-indigo-900/60 text-indigo-200 border-indigo-700',
          avatarEmoji: '😪',
          desc: 'Stirring now and then. Small twitches and whimpers.'
        };
      case 'drowsy':
        return {
          label: 'Drowsy & Heavy-Eyed',
          color: 'bg-purple-950/80 text-purple-300 border-purple-800',
          avatarEmoji: '🥱',
          desc: 'Eyes heavy. A good moment to try for sleep.'
        };
      case 'playful':
      case 'quiet_alert':
        return {
          label: babyState.mood === 'playful' ? 'Playful & Cooing' : 'Quiet & Alert',
          color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
          avatarEmoji: '👶',
          desc: 'Looking around, calm and curious.'
        };
      case 'fussy':
        return {
          label: 'Fussy & Squirming',
          color: 'bg-amber-950/80 text-amber-300 border-amber-800',
          avatarEmoji: '🥺',
          desc: 'Squirming and grizzling. Something is starting to bother them.'
        };
      case 'active_crying':
        return {
          label: 'Active Crying',
          color: 'bg-rose-950/90 text-rose-200 border-rose-800 shadow-md shadow-rose-950/50',
          avatarEmoji: '😭',
          desc: 'Crying hard. You will have to work out why.'
        };
      case 'inconsolable':
        return {
          label: 'Inconsolable / Overstimulated',
          color: 'bg-red-950 text-red-200 border-red-700 animate-pulse',
          avatarEmoji: '😫',
          desc: 'Beyond settling easily. Slow down, hold them, and work through the basics.'
        };
      default:
        return {
          label: 'Awake',
          color: 'bg-stone-800 text-stone-200 border-stone-700',
          avatarEmoji: '👶',
          desc: 'Awake and present.'
        };
    }
  };

  const moodInfo = getMoodVisual();
  const babyDescription = describeBaby(baby, babyState, stage);
  const preferred = userProfile.householdType === 'two_parent' ? preferredCaregiver(babyState, parents) : null;

  return (
    <div className="flex-1 p-4 space-y-4 text-stone-100 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Simulation Banner & Active Parent Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-stone-800/40 border border-stone-700/60 text-xs">
        <div className="flex items-center space-x-2">
          <Clock className={`w-3.5 h-3.5 ${isNight ? 'text-indigo-400' : 'text-amber-400'}`} />
          <span className="font-semibold text-stone-200">
            {isNight ? '🌙 Nighttime' : '☀️ Daytime'} • {timeString}
          </span>
        </div>

        {/* Active Caregiver Switcher */}
        {userProfile.householdType === 'two_parent' && otherParent && (
          <button
            onClick={() => onSwitchActiveParent(otherParent.id)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-teal-950/70 border border-teal-800/70 text-teal-300 hover:bg-teal-900/80 transition-colors text-[11px]"
            title="Switch active caregiver for shift duty"
          >
            <Users className="w-3 h-3" />
            <span>Active: <strong>{activeParent.name}</strong> (Swap)</span>
          </button>
        )}
      </div>

      {/* Urgent / Active Event Alert Banner (if any) */}
      {activeUnresolvedEvent && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-100 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
              <span className="font-bold text-xs text-rose-100">{activeUnresolvedEvent.title}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-900/90 text-rose-200 uppercase font-semibold">
              Action Needed
            </span>
          </div>
          <p className="text-[11px] text-rose-200/90 leading-relaxed">
            {activeUnresolvedEvent.description}
          </p>
          <div className="flex justify-end pt-1">
            <button
              onClick={() => onResolveEvent(activeUnresolvedEvent.id)}
              className="px-3 py-1 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Acknowledge & Care</span>
            </button>
          </div>
        </div>
      )}

      {/* While-you-were-away summary (shown until another event arrives) */}
      {awaySummary && (
        <div className="p-3.5 rounded-2xl bg-stone-800/60 border border-stone-700 text-stone-200 space-y-1">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="font-bold text-xs">{awaySummary.title}</span>
          </div>
          <p className="text-[11px] text-stone-300 leading-relaxed">{awaySummary.description}</p>
        </div>
      )}

      {/* Main Baby Hero Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-b from-stone-800/70 to-stone-900/90 border border-stone-700/60 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-stone-100 tracking-tight">{baby.name}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-700 text-stone-300 font-mono">
                {formatDevelopmentalAge(ageDays)}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                stage === 'infant_4_6mo' 
                  ? 'bg-orange-950/80 text-orange-300 border border-orange-800/60'
                  : stage === 'social_infant'
                  ? 'bg-teal-950/80 text-teal-300 border border-teal-800/60'
                  : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
              }`}>
                {stage === 'infant_4_6mo' ? '4-6M Infant' : stage === 'social_infant' ? 'Social Infant' : 'Newborn'}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Day {careDay + 1} together • {formatWeight(baby.currentWeightGrams, settings.unitSystem)} • {formatLength(baby.currentLengthCm, settings.unitSystem)}
            </p>
          </div>

          {/* Wellbeing Quick Score */}
          <div 
            onClick={() => onNavigate('needs_status')}
            className="cursor-pointer text-right px-2.5 py-1 rounded-2xl bg-stone-950/60 border border-stone-800 hover:border-stone-700 transition-colors"
          >
            <span className="text-[10px] text-stone-400 block">Wellbeing</span>
            <span className="text-sm font-bold text-teal-300 font-mono">{scoreReport.babyWellbeingScore}%</span>
          </div>
        </div>

        {/* Animated Baby State Representation */}
        <div className="py-3 flex flex-col items-center justify-center text-center space-y-2">
          <div 
            onClick={() => {
              if (babyState.mood === 'playful' || babyState.mood === 'quiet_alert') {
                soundFx.playBabyCoo();
              } else {
                soundFx.playHeartbeat();
              }
            }}
            className="w-24 h-24 rounded-full bg-stone-800/80 border-2 border-stone-700 flex items-center justify-center text-5xl shadow-inner cursor-pointer hover:scale-105 transition-transform"
            title="Tap baby for gentle sound interaction"
          >
            {moodInfo.avatarEmoji}
          </div>

          <div className="space-y-1">
            <span className={`inline-block text-xs px-3 py-1 rounded-full border font-semibold ${moodInfo.color}`}>
              {moodInfo.label}
            </span>
            <p className="text-[11px] text-stone-400 max-w-xs leading-tight">
              {babyDescription}
            </p>
            {preferred && (
              <p className="text-[10px] text-teal-400/80 max-w-xs leading-tight">
                {baby.name} has started settling more easily with {preferred.parent.name}.
              </p>
            )}
          </div>
        </div>

        {/* Physiological Needs Overview Bars */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-stone-800/60">
          
          {/* Hunger Meter */}
          <div 
            onClick={() => onNavigate('needs_status')}
            className="p-2.5 rounded-2xl bg-stone-950/50 border border-stone-800/80 space-y-1.5 cursor-pointer hover:border-amber-800/50 transition-colors"
          >
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-300 flex items-center space-x-1 font-medium">
                <Droplet className="w-3 h-3 text-amber-400" />
                <span>Hunger</span>
              </span>
              <span className="font-mono text-amber-300 font-bold text-[11px]">{Math.round(babyState.hunger)}%</span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  babyState.hunger > 70 ? 'bg-rose-500' : babyState.hunger > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${babyState.hunger}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-500 block">
              {minutesSinceFeed < 60 ? `${minutesSinceFeed}m ago` : `${Math.floor(minutesSinceFeed / 60)}h ago`}
            </span>
          </div>

          {/* Sleepiness / Wake Window */}
          <div 
            onClick={() => onNavigate('needs_status')}
            className="p-2.5 rounded-2xl bg-stone-950/50 border border-stone-800/80 space-y-1.5 cursor-pointer hover:border-indigo-800/50 transition-colors"
          >
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-300 flex items-center space-x-1 font-medium">
                <Moon className="w-3 h-3 text-indigo-400" />
                <span>Sleepiness</span>
              </span>
              <span className="font-mono text-indigo-300 font-bold text-[11px]">{Math.round(babyState.sleepiness)}%</span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  babyState.sleepiness > 80 ? 'bg-rose-500' : babyState.sleepiness > 50 ? 'bg-indigo-500' : 'bg-teal-500'
                }`}
                style={{ width: `${babyState.sleepiness}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-500 block">
              {babyState.isSleeping ? `Asleep for ${Math.floor(babyState.sleepMinutesElapsed)}m` : `Awake for ${Math.floor(babyState.awakeMinutesElapsed)}m`}
            </span>
          </div>

          {/* Comfort Level */}
          <div 
            onClick={() => onNavigate('needs_status')}
            className="p-2.5 rounded-2xl bg-stone-950/50 border border-stone-800/80 space-y-1.5 cursor-pointer hover:border-rose-800/50 transition-colors"
          >
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-300 flex items-center space-x-1 font-medium">
                <Heart className="w-3 h-3 text-rose-400" />
                <span>Comfort</span>
              </span>
              <span className="font-mono text-rose-300 font-bold text-[11px]">{Math.round(babyState.comfort)}%</span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${babyState.comfort}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-500 block">
              {babyState.comfort > 60 ? 'Settled' : babyState.comfort > 30 ? 'Unsettled' : 'Distressed'}
            </span>
          </div>

          {/* Diaper Hygiene */}
          <div 
            onClick={() => onNavigate('needs_status')}
            className="p-2.5 rounded-2xl bg-stone-950/50 border border-stone-800/80 space-y-1.5 cursor-pointer hover:border-teal-800/50 transition-colors"
          >
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-300 flex items-center space-x-1 font-medium">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>Nappy</span>
              </span>
              <span className={`font-mono font-bold text-[10px] uppercase ${
                babyState.diaperType === 'clean' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {babyState.diaperType}
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  babyState.diaperSoiled > 60 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(15, babyState.diaperSoiled)}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-500 block">
              {minutesSinceDiaper < 60 ? `${minutesSinceDiaper}m ago` : `${Math.floor(minutesSinceDiaper / 60)}h ago`}
            </span>
          </div>

        </div>
      </div>

      {/* Quick Action Matrix (The core caregiving controls) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-200 tracking-wide uppercase">
            Caregiving Actions
          </span>
          <span className="text-[10px] text-stone-400">
            Caregiver: <strong className="text-teal-400">{activeParent.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          
          <button
            onClick={() => onOpenActionModal('feed')}
            className="p-3 rounded-2xl bg-stone-800/70 hover:bg-amber-950/50 border border-stone-700/60 hover:border-amber-700 text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group"
          >
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-800/60 group-hover:scale-110 transition-transform">
              <Droplet className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">Milk</span>
          </button>

          {ageDays >= 180 && (
            <button
              onClick={() => onOpenActionModal('feed_solids')}
              className="p-3 rounded-2xl bg-stone-800/70 hover:bg-orange-950/50 border border-stone-700/60 hover:border-orange-700 text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group"
            >
              <div className="p-2 rounded-xl bg-orange-950/80 text-orange-300 border border-orange-800/60 group-hover:scale-110 transition-transform">
                <Utensils className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold">Solids</span>
            </button>
          )}

          <button
            onClick={() => onOpenActionModal('burp')}
            className="p-3 rounded-2xl bg-stone-800/70 hover:bg-cyan-950/50 border border-stone-700/60 hover:border-cyan-700 text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group"
          >
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 group-hover:scale-110 transition-transform">
              <Wind className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">Burp</span>
          </button>

          <button
            onClick={() => onOpenActionModal('change_diaper')}
            className="p-3 rounded-2xl bg-stone-800/70 hover:bg-emerald-950/50 border border-stone-700/60 hover:border-emerald-700 text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group"
          >
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">Nappy</span>
          </button>

          <button
            onClick={() => onOpenActionModal('cuddle')}
            className="p-3 rounded-2xl bg-stone-800/70 hover:bg-rose-950/50 border border-stone-700/60 hover:border-rose-700 text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group"
          >
            <div className="p-2 rounded-xl bg-rose-950/80 text-rose-300 border border-rose-800/60 group-hover:scale-110 transition-transform">
              <Heart className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">Cuddle</span>
          </button>

          <button
            onClick={() => onOpenActionModal('put_to_sleep')}
            className="p-3 rounded-2xl bg-stone-800/70 hover:bg-indigo-950/50 border border-stone-700/60 hover:border-indigo-700 text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group"
          >
            <div className="p-2 rounded-xl bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 group-hover:scale-110 transition-transform">
              <Moon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">Sleep</span>
          </button>

          <button
            onClick={() => onOpenActionModal('observe')}
            className="p-3 rounded-2xl bg-stone-800/70 hover:bg-teal-950/50 border border-stone-700/60 hover:border-teal-700 text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group"
          >
            <div className="p-2 rounded-xl bg-teal-950/80 text-teal-300 border border-teal-800/60 group-hover:scale-110 transition-transform">
              <Info className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">Look</span>
          </button>

          <button
            onClick={() => onOpenActionModal('parent_break')}
            className="p-3 rounded-2xl bg-stone-800/70 hover:bg-stone-700/60 border border-stone-700/60 text-stone-200 flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group"
          >
            <div className="p-2 rounded-xl bg-stone-900 text-amber-400 border border-stone-700 group-hover:scale-110 transition-transform">
              <Coffee className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">Self-Care</span>
          </button>

        </div>
      </div>

      {/* Parent Fatigue & State Preview Card */}
      <div 
        onClick={() => onNavigate('parent_status')}
        className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-700/50 flex items-center justify-between cursor-pointer hover:bg-stone-800/60 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-teal-950 text-teal-400 border border-teal-800/60">
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-stone-200">
              {activeParent.name}'s Stress: <span className="text-teal-300">{Math.round(activeParent.stressLevel)}%</span> • Sleep Debt: <span className="text-amber-300">{activeParent.sleepDebtHours}h</span>
            </p>
            <p className="text-[10px] text-stone-400">
              Confidence: {Math.round(activeParent.confidence)}% • Energy: {Math.round(activeParent.energy)}%
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-stone-500" />
      </div>

    </div>
  );
};
