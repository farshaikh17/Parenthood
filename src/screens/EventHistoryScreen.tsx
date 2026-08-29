/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CareActionRecord, SimulationEvent } from '../types';
import { 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Droplet, 
  Wind, 
  Sparkles, 
  Heart, 
  Moon, 
  Coffee, 
  ShieldAlert, 
  Award,
  Clock
} from 'lucide-react';

interface EventHistoryScreenProps {
  events: SimulationEvent[];
  actions: CareActionRecord[];
  onResolveEvent: (id: string) => void;
}

export const EventHistoryScreen: React.FC<EventHistoryScreenProps> = ({
  events,
  actions,
  onResolveEvent
}) => {
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'feed': return <Droplet className="w-3.5 h-3.5 text-amber-400" />;
      case 'burp': return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
      case 'change_diaper': return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case 'cuddle':
      case 'rock': return <Heart className="w-3.5 h-3.5 text-rose-400" />;
      case 'put_to_sleep': return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      case 'parent_break': return <Coffee className="w-3.5 h-3.5 text-amber-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-teal-400" />;
    }
  };

  // Combine and sort chronological log
  const combinedTimeline = [
    ...events.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      itemType: 'event' as const,
      eventType: e.type,
      title: e.title,
      description: e.description,
      educationalNote: e.educationalNote,
      severity: e.severity,
      resolved: e.resolved
    })),
    ...actions.map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      itemType: 'action' as const,
      eventType: undefined,
      title: a.source === 'autopilot' ? `While away: ${a.actionType.replace(/_/g, ' ')}` : `You: ${a.actionType.replace(/_/g, ' ')}`,
      description: a.details,
      educationalNote: undefined,
      severity: 'info' as const,
      resolved: true,
      actionType: a.actionType
    }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex-1 p-4 space-y-4 text-stone-100 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-stone-800/80 to-stone-900/90 border border-stone-700/60 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 font-mono">Timeline</span>
          <h2 className="text-base font-bold text-stone-100 mt-0.5">What happened</h2>
          <p className="text-xs text-stone-400">
            Entries: {combinedTimeline.length}
          </p>
        </div>

        <div className="p-2.5 rounded-2xl bg-stone-950/60 border border-stone-800 text-teal-400">
          <History className="w-5 h-5" />
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {combinedTimeline.length === 0 ? (
          <div className="text-center py-12 text-stone-500 text-xs">
            No events logged yet. The simulation will record baby cues and care actions continuously.
          </div>
        ) : (
          combinedTimeline.map((item) => {
            const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (item.itemType === 'event') {
              const isUrgent = item.severity === 'urgent' || item.severity === 'warning';
              const isNightWake = item.eventType === 'night_waking' || item.eventType === 'sleep_regression';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                    !item.resolved
                      ? isNightWake
                        ? 'bg-indigo-950/40 border-indigo-700/70'
                        : 'bg-rose-950/40 border-rose-800/70'
                      : 'bg-stone-800/30 border-stone-700/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-xl border ${
                        !item.resolved 
                          ? isNightWake 
                            ? 'bg-indigo-950 text-indigo-300 border-indigo-700' 
                            : 'bg-rose-950 text-rose-400 border-rose-800' 
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}>
                        {isNightWake ? (
                          <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        ) : isUrgent ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Award className="w-3.5 h-3.5 text-teal-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-bold text-stone-200">{item.title}</h4>
                          {isNightWake && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/70 text-indigo-300 border border-indigo-700/50 font-medium">
                              Night Wake
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono">{timeStr}</span>
                      </div>
                    </div>

                    {!item.resolved && (
                      <button
                        onClick={() => onResolveEvent(item.id)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg text-white font-medium flex items-center space-x-1 ${
                          isNightWake ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-rose-700 hover:bg-rose-600'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed">{item.description}</p>

                  {item.educationalNote && (
                    <div className="p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/80 text-[10px] text-stone-400 leading-normal">
                      <span className="text-teal-400 font-semibold">Why: </span>
                      {item.educationalNote}
                    </div>
                  )}
                </div>
              );
            }

            // Action item
            return (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-stone-800/20 border border-stone-800/60 flex items-start space-x-3 text-xs"
              >
                <div className="p-2 rounded-xl bg-stone-900 border border-stone-800 shrink-0">
                  {getActionIcon(item.actionType || '')}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-stone-200 capitalize">{item.title}</span>
                    <span className="text-[10px] text-stone-500 font-mono">{timeStr}</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
