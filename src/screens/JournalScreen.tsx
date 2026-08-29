/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Baby, CareActionRecord, JournalEntry, Milestone, Parent, SimulationEvent } from '../types';
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
import confetti from 'canvas-confetti';

interface JournalScreenProps {
  baby: Baby;
  parents: Parent[];
  milestones: Milestone[];
  journalEntries: JournalEntry[];
  recentEvents: SimulationEvent[];
  actionRecords: CareActionRecord[];
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
  simulatedTimeMs,
  onAddJournalEntry
}) => {
  const [activeTab, setActiveTab] = useState<'journal' | 'milestones'>('journal');
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [parentNote, setParentNote] = useState<string>('');

  const ageDays = Math.max(0, Math.floor((simulatedTimeMs - baby.birthTimestamp) / (24 * 60 * 60 * 1000)));

  const handleGenerateReflection = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/gemini/journal-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          babyName: baby.name,
          ageDays,
          temperament: baby.temperament,
          recentEvents: recentEvents.slice(-5).map(e => e.title),
          parentStress: parents[0]?.stressLevel || 30,
          parentingConfidence: parents[0]?.confidence || 60
        })
      });

      const data = await response.json();

      const newEntry: JournalEntry = {
        id: `journal_${Date.now()}`,
        dayNumber: ageDays,
        simDateString: new Date(simulatedTimeMs).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        title: `Day ${ageDays}: Daily Caregiving Reflection`,
        summary: `Reflecting on ${baby.name}'s feeding rhythms and care moments.`,
        reflection: data.reflection || `Today was filled with attentive care. Every responsive moment shapes ${baby.name}'s sense of safety.`,
        educationalInsight: data.milestoneInsight || 'Responsive caregiving builds secure attachment neural pathways in young infants.',
        parentNotes: parentNote.trim() || undefined,
        stats: {
          feedsCount: actionRecords.filter(a => a.actionType === 'feed').length,
          diapersCount: actionRecords.filter(a => a.actionType === 'change_diaper').length,
          sleepHoursTotal: parseFloat((ageDays * 14.5).toFixed(1)),
          cryingMinutesTotal: 45,
          avgParentStress: Math.round(parents[0]?.stressLevel || 30)
        },
        milestonesEarned: milestones.filter(m => m.unlocked).map(m => m.title)
      };

      onAddJournalEntry(newEntry);
      setParentNote('');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Failed to generate journal:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const unlockedCount = milestones.filter(m => m.unlocked).length;

  return (
    <div className="flex-1 p-4 space-y-4 text-stone-100 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-stone-800/80 to-stone-900/90 border border-stone-700/60 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 font-mono">Memories & Development</span>
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
              Synthesize your caregiving actions, soothing interventions, and emotional moments into an observational parenting memory.
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
                  <span>Synthesizing Reflection...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Log Day {ageDays} Journal Entry</span>
                </>
              )}
            </button>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-3">
            {journalEntries.length === 0 ? (
              <div className="p-6 text-center text-stone-500 text-xs rounded-2xl border border-dashed border-stone-800">
                No journal entries yet. Tap "Log Day {ageDays} Journal Entry" above to create your first milestone memory.
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
                      <strong className="text-teal-300">Pediatric Science: </strong>
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
                  <span className="text-teal-400 font-medium">Science Insight: </span>
                  {m.educationalInsight}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
