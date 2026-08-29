/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Baby, BabyState, CareActionRecord, DayLog, Parent, ScoreReport, SimulationEvent, UserProfile } from '../types';
import { buildMemorySummary, memoryToSentences } from '../simulation/memory';
import { 
  HeartHandshake, 
  Brain, 
  Activity, 
  Moon, 
  Coffee, 
  Users, 
  ShieldCheck, 
  Award,
  Zap,
  Heart,
  Sparkles
} from 'lucide-react';
import { EducationalCard } from '../components/EducationalCard';
import { EDUCATIONAL_TOPICS } from '../content/copy';

interface ParentStatusScreenProps {
  parents: Parent[];
  userProfile: UserProfile;
  scoreReport: ScoreReport;
  baby?: Baby;
  babyState?: BabyState;
  onSwitchActiveParent: (parentId: string) => void;
  onOpenSelfCare: () => void;
  actionRecords?: CareActionRecord[];
  events?: SimulationEvent[];
  dayLogs?: DayLog[];
}

export const ParentStatusScreen: React.FC<ParentStatusScreenProps> = ({
  parents,
  userProfile,
  scoreReport,
  baby,
  babyState,
  onSwitchActiveParent,
  onOpenSelfCare,
  actionRecords = [],
  events = [],
  dayLogs = []
}) => {
  const memorySentences = baby && babyState ? memoryToSentences(baby.name, buildMemorySummary(baby, babyState, parents, actionRecords, events, dayLogs)) : [];
  const activeParent = parents.find(p => p.id === userProfile.activeParentId) || parents[0];

  return (
    <div className="flex-1 p-4 space-y-4 text-stone-100 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Top Parental Wellbeing Summary */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-stone-800/80 to-stone-900/90 border border-stone-700/60 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 font-mono">Caregiver Wellbeing</span>
          <h2 className="text-base font-bold text-stone-100 mt-0.5">Parent Endurance & Mental Health</h2>
          <p className="text-xs text-stone-400">
            Household: <span className="text-teal-300 font-medium capitalize">{userProfile.householdType.replace('_', ' ')}</span>
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-teal-300 font-mono">{scoreReport.parentWellbeingScore}%</div>
          <span className="text-[10px] text-stone-400">Parent Index</span>
        </div>
      </div>

      {/* Parent Cards */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-stone-300 uppercase tracking-wide">
          Caregiver Profiles
        </span>

        {parents.map((p) => {
          const isActive = p.id === userProfile.activeParentId;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                isActive
                  ? 'bg-stone-850 bg-stone-800/60 border-teal-500/70 ring-1 ring-teal-500/30'
                  : 'bg-stone-800/30 border-stone-700/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-stone-100">{p.name}</h3>
                    {isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-semibold font-mono">
                        Active Shift
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 capitalize">
                    {p.role} • {p.workStatus.replace('_', ' ')}
                  </p>
                </div>

                {!isActive && (
                  <button
                    onClick={() => onSwitchActiveParent(p.id)}
                    className="text-xs px-2.5 py-1 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200"
                  >
                    Take Over Shift
                  </button>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                
                {/* Stress Level */}
                <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800">
                  <div className="flex justify-between items-center text-stone-400 mb-1">
                    <span>Stress Level</span>
                    <span className={`font-mono font-bold ${p.stressLevel > 60 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {Math.round(p.stressLevel)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${p.stressLevel > 60 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${p.stressLevel}%` }}
                    />
                  </div>
                </div>

                {/* Sleep Debt */}
                <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800">
                  <div className="flex justify-between items-center text-stone-400 mb-1">
                    <span>Sleep Debt</span>
                    <span className="font-mono font-bold text-amber-300">{p.sleepDebtHours} hrs</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500"
                      style={{ width: `${Math.min(100, p.sleepDebtHours * 10)}%` }}
                    />
                  </div>
                </div>

                {/* Confidence */}
                <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800">
                  <div className="flex justify-between items-center text-stone-400 mb-1">
                    <span>Confidence</span>
                    <span className="font-mono font-bold text-teal-300">{Math.round(p.confidence)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500"
                      style={{ width: `${p.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Energy */}
                <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800">
                  <div className="flex justify-between items-center text-stone-400 mb-1">
                    <span>Energy Tank</span>
                    <span className="font-mono font-bold text-cyan-300">{Math.round(p.energy)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500"
                      style={{ width: `${p.energy}%` }}
                    />
                  </div>
                </div>

              </div>

              {/* Caregiver Memory & Soothing Effectiveness Summary */}
              {(() => {
                const stats = babyState?.caregiverEffectiveness?.[p.id];
                const hasHistory = stats && stats.sootheAttempts > 0;
                const affinity = hasHistory ? stats.affinityScore : 50;

                return (
                  <div className="mt-2 pt-2.5 border-t border-stone-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1 text-stone-300 font-medium">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span>How {baby ? baby.name : 'the baby'} responds to {p.name}</span>
                      </div>
                      <span className={`font-mono text-[11px] font-bold ${affinity >= 70 ? 'text-teal-300' : 'text-amber-300'}`}>
                        {hasHistory ? `${affinity}%` : 'Getting to know each other'}
                      </span>
                    </div>

                    {hasHistory ? (
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-400 bg-stone-900/60 p-2 rounded-xl border border-stone-800/60">
                        <div>
                          <span className="text-stone-400">Success Rate: </span>
                          <span className="font-mono text-teal-300 font-semibold">
                            {Math.round((stats.sootheSuccesses / stats.sootheAttempts) * 100)}% ({stats.sootheSuccesses}/{stats.sootheAttempts})
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400">Avg Soothe: </span>
                          <span className="font-mono text-cyan-300 font-semibold">
                            {stats.avgTimeToComfortMinutes} min
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-stone-400 italic">
                        {baby ? `${baby.name} is still getting used to ${p.name}.` : `No soothing recorded yet for ${p.name}.`}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Two-Parent Relationship & Workload Balance */}
      {userProfile.householdType === 'two_parent' && parents.length >= 2 && (
        <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HeartHandshake className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-stone-200">Relationship Harmony & Co-Parenting</span>
            </div>
            <span className="text-xs font-mono font-bold text-rose-300">{scoreReport.relationshipScore}%</span>
          </div>

          <p className="text-[11px] text-stone-400 leading-relaxed">
            In the simulation this reflects how evenly the work and the broken nights are shared. It is an observation, not a judgement.
          </p>
        </div>
      )}

      <p className="text-[10px] text-stone-500 px-1">Scores and percentages here are reflective tools built from the simulation, not a measure of whether anyone is ready to be a parent.</p>

      {/* What the baby has learned — from records only */}
      <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-2">
        <span className="text-xs font-bold text-stone-200 block">What {baby ? baby.name : 'the baby'} has learned about you</span>
        {memorySentences.length === 0 ? (
          <p className="text-[11px] text-stone-500">Nothing yet — patterns show up after a few days of care.</p>
        ) : (
          <ul className="text-[11px] text-stone-300 space-y-1">
            {memorySentences.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        )}
        <p className="text-[10px] text-stone-500">Built only from what actually happened in the simulation.</p>
      </div>

      {/* Self-Care Button */}
      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-amber-200">Need ten minutes?</h4>
          <p className="text-[10px] text-stone-400">Step away. It helps a little; the work is still there after.</p>
        </div>
        <button
          onClick={onOpenSelfCare}
          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-950/40 flex items-center space-x-1.5"
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Take a break</span>
        </button>
      </div>

      {/* Educational Insight Card */}
      <EducationalCard item={EDUCATIONAL_TOPICS[4]} />

    </div>
  );
};
