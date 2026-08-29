/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Baby, BabyState, ScoreReport, UnitSystem } from '../types';
import { formatLength, formatWeight, formatWeightDelta } from '../utils/units';
import { 
  Droplet, 
  Moon, 
  Heart, 
  Sparkles, 
  Scale, 
  Ruler, 
  Activity, 
  Info,
  ShieldCheck,
  Utensils
} from 'lucide-react';
import { EducationalCard } from '../components/EducationalCard';
import { EDUCATIONAL_TOPICS, HEALTH_NOTE } from '../content/copy';
import { getDevelopmentalStage, SOLIDS_MIN_AGE_DAYS } from '../simulation/engine';
import { getDevelopmentalAgeDays } from '../simulation/clock';

interface NeedsStatusScreenProps {
  baby: Baby;
  babyState: BabyState;
  scoreReport: ScoreReport;
  simulatedTimeMs: number;
  unitSystem: UnitSystem;
  onOpenAction: (actionType: string) => void;
}

export const NeedsStatusScreen: React.FC<NeedsStatusScreenProps> = ({
  baby,
  babyState,
  scoreReport,
  simulatedTimeMs,
  unitSystem,
  onOpenAction
}) => {
  const ageDays = getDevelopmentalAgeDays(baby);
  const stage = getDevelopmentalStage(ageDays);
  void stage;

  return (
    <div className="flex-1 p-4 space-y-4 text-stone-100 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Top Score Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-stone-800/80 to-stone-900/90 border border-stone-700/60 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 font-mono">Needs</span>
          <h2 className="text-base font-bold text-stone-100 mt-0.5">What {baby.name} needs right now</h2>
          <p className="text-xs text-stone-400">
            These are the simulation's own values. They are not medical measurements.
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-teal-300 font-mono">{scoreReport.babyWellbeingScore}%</div>
          <span className="text-[10px] text-stone-400">Wellbeing Index</span>
        </div>
      </div>

      {/* Deep-Dive Biological Need Gauges */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-stone-300 uppercase tracking-wide">
          Needs
        </span>

        {/* 1. Hunger & Nutrition */}
        <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
                <Droplet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-200">Hunger</span>
                <span className="text-[10px] text-stone-400 block">Rises faster or slower depending on the baby and the day</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300">{Math.round(babyState.hunger)}%</span>
          </div>

          <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                babyState.hunger > 70 ? 'bg-rose-500' : babyState.hunger > 40 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${babyState.hunger}%` }}
            />
          </div>

          <div className="flex justify-between items-center pt-1 text-[11px]">
            <span className="text-stone-400">
              {babyState.hunger > 60 ? 'Rooting, sucking on hands' : babyState.hunger > 35 ? 'Could take a feed soon' : 'Recently fed'}
            </span>
            <button
              onClick={() => onOpenAction('feed')}
              className="text-xs px-2.5 py-1 rounded-lg bg-amber-900/60 text-amber-200 border border-amber-700 hover:bg-amber-800"
            >
              Feed
            </button>
          </div>
        </div>

        {/* 1b. Complementary Solids Need (4-6 Month Stage) */}
        {ageDays >= SOLIDS_MIN_AGE_DAYS && (
          <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-orange-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-orange-950 text-orange-400 border border-orange-800">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-200">Interest in solids</span>
                  <span className="text-[10px] text-stone-400 block">Small tastes alongside milk (around 6 months)</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-orange-300">{Math.round(babyState.solidFoodHunger || 0)}%</span>
            </div>

            <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  (babyState.solidFoodHunger || 0) > 70 ? 'bg-orange-500' : 'bg-amber-500'
                }`}
                style={{ width: `${babyState.solidFoodHunger || 0}%` }}
              />
            </div>

            <div className="flex justify-between items-center pt-1 text-[11px]">
              <span className="text-stone-400">
                {(babyState.solidFoodHunger || 0) > 60 ? 'Watching you eat with interest' : 'Not interested right now'}
              </span>
              <button
                onClick={() => onOpenAction('feed_solids')}
                className="text-xs px-2.5 py-1 rounded-lg bg-orange-900/60 text-orange-200 border border-orange-700 hover:bg-orange-800"
              >
                Offer Solids
              </button>
            </div>
          </div>
        )}

        {/* 2. Sleep & Wake Windows */}
        <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-200">Tiredness</span>
                <span className="text-[10px] text-stone-400 block">
                  {babyState.isSleeping ? `Sleeping (${Math.floor(babyState.sleepMinutesElapsed)} min)` : `Awake (${Math.floor(babyState.awakeMinutesElapsed)} min)`}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-300">{Math.round(babyState.sleepiness)}%</span>
          </div>

          <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                babyState.sleepiness > 80 ? 'bg-rose-500' : babyState.sleepiness > 50 ? 'bg-indigo-500' : 'bg-teal-500'
              }`}
              style={{ width: `${babyState.sleepiness}%` }}
            />
          </div>

          <div className="flex justify-between items-center pt-1 text-[11px]">
            <span className="text-stone-400">
              {babyState.sleepiness > 75 && !babyState.isSleeping ? 'Over-tired and fighting sleep' : babyState.isSleeping ? 'Asleep' : 'Comfortably awake'}
            </span>
            <button
              onClick={() => onOpenAction(babyState.isSleeping ? 'cuddle' : 'put_to_sleep')}
              className="text-xs px-2.5 py-1 rounded-lg bg-indigo-900/60 text-indigo-200 border border-indigo-700 hover:bg-indigo-800"
            >
              {babyState.isSleeping ? 'Hold' : 'Put down'}
            </button>
          </div>
        </div>

        {/* 3. Comfort & Gas */}
        <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-200">Comfort</span>
                <span className="text-[10px] text-stone-400 block">Drops with hunger, a wet nappy, wind, or being awake too long</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-rose-300">{Math.round(babyState.comfort)}%</span>
          </div>

          <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-500 transition-all duration-300"
              style={{ width: `${babyState.comfort}%` }}
            />
          </div>

          <div className="flex justify-between items-center pt-1 text-[11px]">
            <span className="text-stone-400">
              {babyState.gasDiscomfort > 50 ? 'Squirming, pulling legs up' : babyState.diaperSoiled > 50 ? 'Nappy needs checking' : babyState.comfort > 60 ? 'Settled' : 'Unsettled'}
            </span>
            <div className="flex space-x-1.5">
              <button
                onClick={() => onOpenAction('burp')}
                className="text-xs px-2 py-1 rounded-lg bg-cyan-950 text-cyan-200 border border-cyan-800 hover:bg-cyan-900"
              >
                Burp
              </button>
              <button
                onClick={() => onOpenAction('cuddle')}
                className="text-xs px-2 py-1 rounded-lg bg-rose-950 text-rose-200 border border-rose-800 hover:bg-rose-900"
              >
                Cuddle
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Minimal, honest health: only mild episodes, described by what you'd notice */}
      {babyState.healthState !== 'healthy' && (babyState.healthUntil || 0) > simulatedTimeMs && (
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/50 space-y-1">
          <span className="text-xs font-bold text-amber-200 block">
            {babyState.healthState === 'sniffles' ? 'A snuffly few days' : 'An unsettled tummy'}
          </span>
          <p className="text-[11px] text-stone-300 leading-relaxed">
            {babyState.healthState === 'sniffles'
              ? `${baby.name} is blocked up: feeds are short and broken and sleep is lighter. It passes on its own in the simulation.`
              : `${baby.name} is windy and uncomfortable today. Burping and holding upright help a little.`}
          </p>
        </div>
      )}
      {babyState.healthState !== 'healthy' && <EducationalCard item={HEALTH_NOTE} />}

      {/* Growth & Development Tracking */}
      <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
        <span className="text-xs font-bold text-stone-200 block">Growth</span>
        <p className="text-[10px] text-stone-500">A smooth simulated curve, not a real growth chart.</p>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs">
            <div className="flex items-center space-x-1.5 text-stone-400 mb-1">
              <Scale className="w-3.5 h-3.5 text-teal-400" />
              <span>Weight</span>
            </div>
            <p className="text-base font-bold text-stone-100 font-mono">{formatWeight(baby.currentWeightGrams, unitSystem)}</p>
            <p className="text-[10px] text-stone-500">Birth: {formatWeight(baby.birthWeightGrams, unitSystem)} ({formatWeightDelta(baby.currentWeightGrams - baby.birthWeightGrams, unitSystem)})</p>
          </div>

          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs">
            <div className="flex items-center space-x-1.5 text-stone-400 mb-1">
              <Ruler className="w-3.5 h-3.5 text-teal-400" />
              <span>Length</span>
            </div>
            <p className="text-base font-bold text-stone-100 font-mono">{formatLength(baby.currentLengthCm, unitSystem)}</p>
            <p className="text-[10px] text-stone-500">Birth: {formatLength(baby.birthLengthCm, unitSystem)}</p>
          </div>
        </div>
      </div>

      {/* Educational Insight Card */}
      <EducationalCard item={EDUCATIONAL_TOPICS[1]} />

    </div>
  );
};
