/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BabyState, CareActionRecord, DayLog, Parent, SimulationEvent } from '../types';

/**
 * Truthful per-day counters. Everything the journal and the final report say about
 * "how the day went" must come from here, never from invented numbers.
 */

export function emptyDayLog(dayNumber: number): DayLog {
  return {
    dayNumber,
    feeds: 0,
    diaperChanges: 0,
    sleepMinutes: 0,
    cryingMinutes: 0,
    nightWakings: 0,
    autopilotActions: 0,
    userActions: 0,
    parentStressSum: 0,
    parentStressSamples: 0
  };
}

export function getDayLog(logs: DayLog[], dayNumber: number): DayLog {
  return logs.find(l => l.dayNumber === dayNumber) || emptyDayLog(dayNumber);
}

function upsert(logs: DayLog[], updated: DayLog): DayLog[] {
  const idx = logs.findIndex(l => l.dayNumber === updated.dayNumber);
  if (idx === -1) return [...logs, updated].slice(-400); // ~13 months of days max
  const copy = logs.slice();
  copy[idx] = updated;
  return copy;
}

/** Called once per engine tick. */
export function accumulateTick(
  logs: DayLog[],
  dayNumber: number,
  prevState: BabyState,
  nextState: BabyState,
  deltaMinutes: number,
  parents: Parent[],
  newEvents: SimulationEvent[]
): DayLog[] {
  const log = { ...getDayLog(logs, dayNumber) };
  if (nextState.isSleeping) log.sleepMinutes += deltaMinutes;
  if (!nextState.isSleeping && (nextState.mood === 'active_crying' || nextState.mood === 'inconsolable')) {
    log.cryingMinutes += deltaMinutes;
  }
  log.nightWakings += newEvents.filter(e => e.type === 'night_waking' || e.type === 'sleep_regression').length;
  if (parents.length > 0) {
    const avg = parents.reduce((s, p) => s + p.stressLevel, 0) / parents.length;
    log.parentStressSum += avg;
    log.parentStressSamples += 1;
  }
  void prevState;
  return upsert(logs, log);
}

/** Called once per caregiving action (user or autopilot). */
export function accumulateAction(logs: DayLog[], dayNumber: number, record: CareActionRecord): DayLog[] {
  const log = { ...getDayLog(logs, dayNumber) };
  if (record.actionType === 'feed' || record.actionType === 'feed_solids') log.feeds += 1;
  if (record.actionType === 'change_diaper') log.diaperChanges += 1;
  if (record.source === 'autopilot') log.autopilotActions += 1;
  else log.userActions += 1;
  return upsert(logs, log);
}

export function summarizeDay(log: DayLog) {
  return {
    feedsCount: log.feeds,
    diapersCount: log.diaperChanges,
    sleepHoursTotal: parseFloat((log.sleepMinutes / 60).toFixed(1)),
    cryingMinutesTotal: Math.round(log.cryingMinutes),
    avgParentStress: log.parentStressSamples > 0 ? Math.round(log.parentStressSum / log.parentStressSamples) : 0,
    derivedFromLog: true as const
  };
}
