/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Baby, BabyState, CareActionRecord, DayLog, Milestone, Parent, SimulationEvent, UserProfile } from '../types';
import { buildJourneyReport } from '../simulation/report';
import { buildFactualStory } from '../simulation/story';
import { API_BASE } from '../ai/apiBase';
import { Award, BookOpen, Heart, Moon, RotateCcw, Sparkles, TrendingUp, Milk, ArrowLeft } from 'lucide-react';

interface Props {
  baby: Baby;
  babyState: BabyState;
  parents: Parent[];
  userProfile: UserProfile | null;
  actionRecords: CareActionRecord[];
  events: SimulationEvent[];
  dayLogs: DayLog[];
  milestones: Milestone[];
  onKeepGoing: () => void;
  onStartAgain: () => void;
}

/**
 * M10 — "Six months together". Everything on this screen comes from the journey report,
 * which is computed from records; the optional AI retelling is given those same facts
 * and nothing else. No grades, no verdicts.
 */
export const JourneyReportScreen: React.FC<Props> = ({ baby, babyState, parents, userProfile, actionRecords, events, dayLogs, milestones, onKeepGoing, onStartAgain }) => {
  const report = useMemo(
    () => buildJourneyReport(baby, babyState, parents, userProfile, actionRecords, events, dayLogs, milestones),
    [baby, babyState, parents, userProfile, actionRecords, events, dayLogs, milestones]
  );
  const factualStory = useMemo(() => buildFactualStory(report), [report]);
  const [story, setStory] = useState<string[] | null>(null);
  const [storyBusy, setStoryBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const tellAsStory = async () => {
    setStoryBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/gemini/journey-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report })
      });
      const data = await res.json();
      if (Array.isArray(data.paragraphs) && data.paragraphs.length) setStory(data.paragraphs);
      else setStory(factualStory);
    } catch {
      setStory(factualStory);
    } finally { setStoryBusy(false); }
  };

  const stat = (icon: React.ReactNode, label: string, value: string) => (
    <div className="p-3 rounded-2xl bg-stone-800/40 border border-stone-700/60">
      <div className="flex items-center space-x-1.5 text-[10px] uppercase font-bold text-stone-400">{icon}<span>{label}</span></div>
      <div className="mt-1 text-lg font-semibold text-stone-100">{value}</div>
    </div>
  );

  return (
    <div className="flex-1 p-4 space-y-4 text-stone-100 overflow-y-auto animate-in fade-in duration-300">
      <button onClick={onKeepGoing} className="flex items-center space-x-1 text-xs text-stone-400 hover:text-stone-200">
        <ArrowLeft className="w-3.5 h-3.5" /><span>Back to {baby.name}</span>
      </button>

      <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-950/70 to-stone-900 border border-teal-800/40 text-center space-y-1">
        <Sparkles className="w-6 h-6 text-teal-300 mx-auto" />
        <h1 className="text-xl font-bold">Six months together</h1>
        <p className="text-xs text-stone-300">{baby.name} • {report.developmentalAgeLabel} • {report.careDays} days of care</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {stat(<Milk className="w-3 h-3" />, 'Feeds', String(report.totals.feeds))}
        {stat(<Heart className="w-3 h-3" />, 'Nappy changes', String(report.totals.diaperChanges))}
        {stat(<Moon className="w-3 h-3" />, 'Night wakings', String(report.totals.nightWakings))}
        {stat(<Award className="w-3 h-3" />, 'Milestones', String(report.milestonesReached.length))}
      </div>

      {/* The story */}
      <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-stone-200">
            <BookOpen className="w-4 h-4 text-teal-400" />
            <span>The story of {baby.name}'s first six months</span>
          </div>
          {!story && (
            <button onClick={tellAsStory} disabled={storyBusy} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border bg-stone-900 border-stone-600 text-stone-200 disabled:opacity-40">
              {storyBusy ? 'Writing…' : 'Retell warmly (AI)'}
            </button>
          )}
        </div>
        {(story || factualStory).map((para, i) => (
          <p key={i} className="text-xs text-stone-300 leading-relaxed">{para}</p>
        ))}
        {story && <p className="text-[10px] text-stone-500">Retold by AI from the recorded facts only. The plain version is always available after a restart.</p>}
      </div>

      {/* Strengths / challenges / patterns */}
      {[
        { title: 'What went well', items: report.strengths, color: 'text-teal-300' },
        { title: 'What was hard', items: report.challenges, color: 'text-amber-300' },
        { title: 'Patterns', items: report.patterns, color: 'text-sky-300' }
      ].filter(s => s.items.length > 0).map(s => (
        <div key={s.title} className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-1.5">
          <div className={`text-xs font-bold ${s.color}`}>{s.title}</div>
          {s.items.map((it, i) => <p key={i} className="text-[11px] text-stone-300 leading-relaxed">• {it}</p>)}
        </div>
      ))}

      {/* Week by week */}
      {report.weeks.length > 0 && (
        <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-stone-200">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>Week by week</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-stone-300">
              <thead><tr className="text-stone-500 text-left"><th className="pr-2 py-1">Week</th><th className="pr-2">Feeds</th><th className="pr-2">Sleep/day</th><th className="pr-2">Crying/day</th><th className="pr-2">Nights</th></tr></thead>
              <tbody>
                {report.weeks.map(w => (
                  <tr key={w.weekIndex} className="border-t border-stone-800">
                    <td className="pr-2 py-1 text-stone-200 font-medium">{w.weekIndex + 1}</td>
                    <td className="pr-2">{w.feeds}</td>
                    <td className="pr-2">{w.sleepHoursPerDay} h</td>
                    <td className="pr-2">{w.cryingMinutesPerDay} min</td>
                    <td className="pr-2">{w.nightWakings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.milestonesReached.length > 0 && (
        <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-1.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-stone-200">
            <Award className="w-4 h-4 text-amber-300" /><span>Milestones reached</span>
          </div>
          <p className="text-[11px] text-stone-300 leading-relaxed">{report.milestonesReached.join(' • ')}</p>
        </div>
      )}

      {/* What now */}
      <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-2">
        <div className="text-xs font-bold text-stone-200">What now?</div>
        <button onClick={onKeepGoing} className="w-full py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold">Keep caring for {baby.name}</button>
        <button
          onClick={() => (confirmReset ? onStartAgain() : setConfirmReset(true))}
          className={`w-full py-2.5 rounded-xl text-xs font-semibold border ${confirmReset ? 'bg-rose-800 border-rose-700 text-white' : 'bg-stone-900 border-stone-700 text-stone-300'}`}
        >
          {confirmReset ? 'Yes — delete everything and start a new journey' : 'Start again with a new baby'}
        </button>
        {confirmReset && <p className="text-[10px] text-amber-200">This deletes {baby.name}, the timeline and the journal from this phone (and the shared copy stops updating). There is no undo.</p>}
      </div>

      <p className="text-[10px] text-stone-500 text-center pb-4">Scores and summaries are reflective tools, not a verdict on you as a future parent.</p>
    </div>
  );
};
