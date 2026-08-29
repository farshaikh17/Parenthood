/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Baby, CareActionRecord, DayLog, JournalEntry, Milestone, Parent, SimulationEvent } from '../types';
import { getDayLog, summarizeDay } from '../simulation/dayLog';
import { MILESTONE_NOTES } from '../content/copy';
import { 
  BookOpen, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  MessageSquare, 
  Send,
  Loader2
} from 'lucide-react';

interface JournalScreenProps {
  baby: Baby;
  parents: Parent[];
  milestones: Milestone[];
  journalEntries: JournalEntry[];
  recentEvents: SimulationEvent[];
  actionRecords: CareActionRecord[];
  dayLogs: DayLog[];
  simulatedTimeMs: number;
  onAddJournalEntry: (entry: JournalEntry) => void;
}

export const JournalScreen: React.FC<JournalScreenProps> = ({
  baby,
  parents,
  milestones,
  journalEntries,
  recentEvents,
  actionRecords,
  dayLogs,
  simulatedTimeMs,
  onAddJournalEntry
}) => {
  const [activeTab, setActiveTab] = useState<'journal' | 'milestones'>('journal');
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [parentNote, setParentNote] = useState<string>('');

  const ageDays = Math.max(0, Math.floor((simulatedTimeMs - baby.birthTimestamp) / (24 * 60 * 60 * 1000)));

  const handleGenerateReflection = async () => {
    setIsGeneratingAI(true);
    const todayLog = getDayLog(dayLogs, ageDays);
    const stats = summarizeDay(todayLog);
    const dayStart = baby.birthTimestamp + ageDays * 86400000;
    const dayEnd = dayStart + 86400000;
    // Structured, truthful day log for the AI — it may only narrate what is in here.
    const todaysEvents = recentEvents
      .filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd)
      .map(e => ({ time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: e.type, title: e.title, resolved: e.resolved }));
    const todaysActions = actionRecords
      .filter(a => a.timestamp >= dayStart && a.timestamp < dayEnd)
      .map(a => ({ time: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: a.actionType, by: a.source === 'autopilot' ? 'autopilot' : (parents.find(p => p.id === a.performedByParentId)?.name || 'parent'), result: a.effectiveness }));
    const milestonesToday = milestones.filter(m => m.unlocked && m.unlockedAtTimestamp && m.unlockedAtTimestamp >= dayStart && m.unlockedAtTimestamp < dayEnd).map(m => m.title);

    let reflection = '';
    let insight = '';
    try {
      const response = await fetch('/api/gemini/journal-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          babyName: baby.name,
          ageDays,
          temperament: baby.temperament,
          caregivers: parents.map(p => p.name),
          dayStats: stats,
          events: todaysEvents.slice(0, 40),
          actions: todaysActions.slice(0, 60),
          milestonesToday,
          parentNote: parentNote.trim() || undefined
        })
      });
      const data = await response.json();
      reflection = data.reflection || '';
      insight = data.milestoneInsight || '';
    } catch (err) {
      console.error('Failed to generate journal:', err);
    }

    // Offline / failure fallback is built ONLY from real counters
    if (!reflection) {
      reflection = `Day ${ageDays}: ${stats.feedsCount} feed${stats.feedsCount === 1 ? '' : 's'}, ${stats.diapersCount} nappy change${stats.diapersCount === 1 ? '' : 's'}, about ${stats.sleepHoursTotal} hours of sleep and ${stats.cryingMinutesTotal} minutes of crying so far.` +
        (todayLog.nightWakings > 0 ? ` ${todayLog.nightWakings} night waking${todayLog.nightWakings === 1 ? '' : 's'}.` : '') +
        (todayLog.autopilotActions > 0 ? ` ${todayLog.autopilotActions} of the care actions happened while you were away.` : '');
    }

    const newEntry: JournalEntry = {
      id: `journal_${Date.now()}`,
      dayNumber: ageDays,
      simDateString: new Date(simulatedTimeMs).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      title: `Day ${ageDays}`,
      summary: `${stats.feedsCount} feeds • ${stats.diapersCount} changes • ${stats.sleepHoursTotal}h sleep • ${stats.cryingMinutesTotal} min crying`,
      reflection,
      educationalInsight: insight,
      parentNotes: parentNote.trim() || undefined,
      stats,
      milestonesEarned: milestonesToday
    };

    onAddJournalEntry(newEntry);
    setParentNote('');
    setIsGeneratingAI(false);
  };

  const unlockedCount = milestones.filter(m => m.unlocked).length;

  return (
    <div className="flex-1 p-4 space-y-4 text-stone-100 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-stone-800/80 to-stone-900/90 border border-stone-700/60 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 font-mono">Journal</span>
          <h2 className="text-base font-bold text-stone-100 mt-0.5">{baby.name}'s Story</h2>
          <p className="text-xs text-stone-400">
            Milestones: <span className="text-teal-300 font-medium">{unlockedCount} of {milestones.length} Unlocked</span>
          </p>
        </div>

        <div className="p-2.5 rounded-2xl bg-stone-950/60 border border-stone-800 text-teal-400">
          <BookOpen className="w-5 h-5" />
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-stone-950 border border-stone-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('journal')}
          className={`py-2 rounded-xl transition-all ${
            activeTab === 'journal' ? 'bg-teal-700 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Daily Reflections ({journalEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`py-2 rounded-xl transition-all ${
            activeTab === 'milestones' ? 'bg-teal-700 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Milestones ({unlockedCount}/{milestones.length})
        </button>
      </div>

      {/* Tab 1: Daily Journal & Reflection Generator */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          
          {/* AI Daily Reflection Generator Card */}
          <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-800/50 space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold text-teal-200">Generate Day {ageDays} Reflection</h3>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              Writes a short entry from what actually happened today — feeds, changes, sleep, crying and your actions. Nothing is invented.
            </p>

            <textarea
              rows={2}
              value={parentNote}
              onChange={(e) => setParentNote(e.target.value)}
              placeholder="Optional personal notes (e.g. 'Emma smiled during our morning song!')..."
              className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            />

            <button
              onClick={handleGenerateReflection}
              disabled={isGeneratingAI}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition-all flex items-center justify-center space-x-2 shadow-md shadow-teal-950/40"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Writing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Write today's entry</span>
                </>
              )}
            </button>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-3">
            {journalEntries.length === 0 ? (
              <div className="p-6 text-center text-stone-500 text-xs rounded-2xl border border-dashed border-stone-800">
                No entries yet. Tap "Write today's entry" to record how today went.
              </div>
            ) : (
              journalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-2.5"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-200">{entry.title}</span>
                    <span className="text-[10px] text-stone-500 font-mono">{entry.simDateString}</span>
                  </div>

                  <p className="text-[10px] text-stone-500 font-mono">{entry.summary}</p>
                  <p className="text-xs text-stone-300 leading-relaxed italic bg-stone-900/60 p-3 rounded-xl border border-stone-800">
                    "{entry.reflection}"
                  </p>

                  {entry.parentNotes && (
                    <div className="text-[11px] text-stone-300">
                      <span className="text-teal-400 font-medium">Parent Note: </span>
                      {entry.parentNotes}
                    </div>
                  )}

                  {entry.educationalInsight && (
                    <div className="text-[10px] text-stone-400 bg-teal-950/40 border border-teal-900/60 p-2 rounded-lg">
                      <strong className="text-teal-300">Note: </strong>
                      {entry.educationalInsight}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* Tab 2: Milestones Checklist */}
      {activeTab === 'milestones' && (
        <div className="space-y-3">
          {milestones.map((m) => {
            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-2xl border transition-all space-y-1.5 ${
                  m.unlocked
                    ? 'bg-teal-950/30 border-teal-600/60 ring-1 ring-teal-600/30'
                    : 'bg-stone-800/30 border-stone-700/40 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {m.unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-stone-600 shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-stone-100">{m.title}</h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-stone-400 font-mono capitalize">
                    {m.category.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-stone-300 pl-6 leading-relaxed">
                  {m.description}
                </p>

                <div className="pl-6 text-[10px] text-stone-400">
                  {MILESTONE_NOTES[m.id] || m.educationalInsight}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
