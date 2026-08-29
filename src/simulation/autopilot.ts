/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Baby,
  BabyState,
  CareActionRecord,
  DayLog,
  Milestone,
  Parent,
  SimulationEvent,
  SimulationSettings,
  UserProfile
} from '../types';
import { SimulationEngine, makeId } from './engine';
import { accumulateAction, accumulateTick } from './dayLog';
import { EVENT_NOTES } from '../content/copy';
import { isNighttimeHour } from './engine';
import { advanceDevelopmentalAge, DEFAULT_COMPRESSION_SCHEDULE } from './clock';

/**
 * AWAY POLICY (product decision: Option B)
 * ---------------------------------------
 * The baby keeps living while the app is closed. A bounded, deliberately imperfect
 * "autopilot" caregiver covers only baseline care (feed, change, burp, settle):
 *  - it reacts late (a need must persist for a while before it acts),
 *  - it never uses the caregiver-memory bonus and never improves the user's confidence,
 *  - it stops a short while before the user returns so there is a real current need,
 *  - every action it takes is logged with source 'autopilot' so the user can see it,
 *  - total catch-up is capped (settings.awayCatchupMaxSimHours).
 * In a two-parent household the autopilot is presented as the partner covering; in a
 * single-parent household it is labelled plainly as simulated baseline care.
 */

export interface AwayCatchupInput {
  baby: Baby;
  babyState: BabyState;
  parents: Parent[];
  userProfile: UserProfile | null;
  settings: SimulationSettings;
  events: SimulationEvent[];
  actionRecords: CareActionRecord[];
  milestones: Milestone[];
  dayLogs: DayLog[];
}

export interface AwayCatchupResult extends AwayCatchupInput {
  processedSimMs: number;
  autopilotSummary: { feeds: number; changes: number; burps: number; settles: number } | null;
}

export const AUTOPILOT_DEFAULTS = {
  /** Autopilot stops acting this many simulated minutes before the user returns. */
  handbackWindowMinutes: 25,
  /** A need must exceed its threshold for this long (sim minutes) before autopilot reacts. */
  reactionDelayMinutes: 20,
  thresholds: { hunger: 65, diaper: 60, gas: 45, sleepiness: 70 },
  /** Minimum sim minutes between autopilot actions (it is one tired adult, not a machine). */
  minGapMinutes: 12
};

export function computeRawElapsedSimMs(settings: SimulationSettings, nowRealMs: number): number {
  const lastReal = settings.lastRealTimestampMs ?? nowRealMs;
  const elapsedRealMs = Math.max(0, nowRealMs - lastReal);
  if (elapsedRealMs < 3000 || settings.isPaused) return 0;
  return elapsedRealMs * (settings.timeSpeed || 1);
}

export function computeElapsedSimMs(settings: SimulationSettings, nowRealMs: number): number {
  const raw = computeRawElapsedSimMs(settings, nowRealMs);
  const cap = (settings.awayCatchupMaxSimHours ?? 24) * 60 * 60 * 1000;
  return Math.min(raw, cap);
}

export function runAwayCatchup(input: AwayCatchupInput, nowRealMs: number): AwayCatchupResult {
  const totalSimMs = computeElapsedSimMs(input.settings, nowRealMs);
  if (totalSimMs <= 0) {
    return { ...input, processedSimMs: 0, autopilotSummary: null };
  }
  // Beyond the cap we don't simulate every minute, but the baby still grew and the clock still moved:
  // developmental age and the care clock advance for the skipped stretch so the journey stays on schedule.
  const rawSimMs = computeRawElapsedSimMs(input.settings, nowRealMs);
  const skippedMs = Math.max(0, rawSimMs - totalSimMs);

  const cfg = AUTOPILOT_DEFAULTS;
  const autopilotOn = input.settings.awayAutopilotEnabled !== false;
  const activeParentId = input.userProfile?.activeParentId || input.parents[0]?.id || 'parent_primary';

  let baby = input.baby;
  let state = input.babyState;
  let parents = input.parents;
  let events = input.events;
  let actions = input.actionRecords;
  let milestones = input.milestones;
  let dayLogs = input.dayLogs;
  let settings = { ...input.settings };
  if (skippedMs > 0) {
    baby = { ...baby, developmentalAgeDays: advanceDevelopmentalAge(baby.developmentalAgeDays ?? 0, skippedMs, settings.compressionSchedule || DEFAULT_COMPRESSION_SCHEDULE) };
    settings = { ...settings, simulatedTimeMs: settings.simulatedTimeMs + skippedMs };
  }

  const stepMs = 5 * 60 * 1000; // 5 simulated minutes per step
  let processed = 0;
  let minutesOverThreshold = { hunger: 0, diaper: 0, gas: 0, sleepiness: 0 };
  let minutesSinceLastAutopilot = cfg.minGapMinutes;
  const summary = { feeds: 0, changes: 0, burps: 0, settles: 0 };

  const startSimTime = settings.simulatedTimeMs;

  while (processed < totalSimMs) {
    const delta = Math.min(stepMs, totalSimMs - processed);
    const deltaMin = delta / 60000;
    const tick = SimulationEngine.tick(baby, state, parents, activeParentId, settings, delta, events, milestones);
    const ageDays = Math.max(0, Math.floor((settings.simulatedTimeMs + delta - baby.birthTimestamp) / 86400000));
    dayLogs = accumulateTick(dayLogs, ageDays, state, tick.nextState, deltaMin, tick.nextParents, tick.newEvents);
    baby = tick.nextBaby;
    state = tick.nextState;
    parents = tick.nextParents;
    events = [...tick.newEvents, ...events];
    milestones = tick.updatedMilestones;
    settings = { ...settings, simulatedTimeMs: settings.simulatedTimeMs + delta };
    processed += delta;
    minutesSinceLastAutopilot += deltaMin;

    // Track how long each need has persisted above its threshold
    minutesOverThreshold = {
      hunger: state.hunger > cfg.thresholds.hunger ? minutesOverThreshold.hunger + deltaMin : 0,
      diaper: state.diaperSoiled > cfg.thresholds.diaper ? minutesOverThreshold.diaper + deltaMin : 0,
      gas: state.gasDiscomfort > cfg.thresholds.gas ? minutesOverThreshold.gas + deltaMin : 0,
      sleepiness: (!state.isSleeping && state.sleepiness > cfg.thresholds.sleepiness) ? minutesOverThreshold.sleepiness + deltaMin : 0
    };

    const remainingMin = (totalSimMs - processed) / 60000;
    const inHandbackWindow = remainingMin <= cfg.handbackWindowMinutes;
    if (!autopilotOn || inHandbackWindow || minutesSinceLastAutopilot < cfg.minGapMinutes) continue;

    // Pick at most one baseline action, in priority order
    let action: string | null = null;
    let params: any = {};
    if (minutesOverThreshold.hunger >= cfg.reactionDelayMinutes) { action = 'feed'; params = { amountMl: baby.currentWeightGrams > 4500 ? 120 : 75 }; }
    else if (minutesOverThreshold.diaper >= cfg.reactionDelayMinutes) action = 'change_diaper';
    else if (minutesOverThreshold.gas >= cfg.reactionDelayMinutes) action = 'burp';
    else if (minutesOverThreshold.sleepiness >= cfg.reactionDelayMinutes) action = state.hunger > 60 || state.gasDiscomfort > 55 ? 'cuddle' : 'put_to_sleep';

    if (!action) continue;

    const applied = SimulationEngine.applyAction(action, baby, state, parents, activeParentId, settings, params, { source: 'autopilot' });
    state = applied.nextState;
    parents = applied.nextParents;
    actions = [applied.record, ...actions];
    dayLogs = accumulateAction(dayLogs, ageDays, applied.record);
    minutesSinceLastAutopilot = 0;
    if (action === 'feed') summary.feeds++;
    else if (action === 'change_diaper') summary.changes++;
    else if (action === 'burp') summary.burps++;
    else summary.settles++;

    // A caregiver burps straight after a feed, and settles a drowsy baby in the same sitting
    if (action === 'feed') {
      if (state.gasDiscomfort > 35) {
        const burped = SimulationEngine.applyAction('burp', baby, state, parents, activeParentId, settings, {}, { source: 'autopilot' });
        state = burped.nextState;
        parents = burped.nextParents;
        actions = [burped.record, ...actions];
        dayLogs = accumulateAction(dayLogs, ageDays, burped.record);
        summary.burps++;
      }
      const nightNow = isNighttimeHour(new Date(settings.simulatedTimeMs).getHours(), settings);
      if (!state.isSleeping && (state.sleepiness > 50 || nightNow)) {
        const settled = SimulationEngine.applyAction('cuddle', baby, state, parents, activeParentId, settings, {}, { source: 'autopilot' });
        state = settled.nextState;
        parents = settled.nextParents;
        actions = [settled.record, ...actions];
        dayLogs = accumulateAction(dayLogs, ageDays, settled.record);
        summary.settles++;
      }
    }

    // Autopilot resolves the crying/night events it responded to
    events = events.map(e =>
      !e.resolved && (e.type === 'crying_spell' || e.type === 'night_waking' || e.type === 'sleep_regression' || e.type === 'hunger_cue')
        ? { ...e, resolved: true, resolvedAt: settings.simulatedTimeMs }
        : e
    );
  }

  // Away time costs the household something: modest stress, and in a two-parent
  // household the partner (not the user) absorbs the energy cost.
  const awayHours = totalSimMs / 3600000;
  const totalAuto = summary.feeds + summary.changes + summary.burps + summary.settles;
  const isTwoParent = input.userProfile?.householdType === 'two_parent' && parents.length >= 2;
  parents = parents.map(p => {
    const isActive = p.id === activeParentId;
    if (isTwoParent && !isActive) {
      return { ...p, energy: Math.max(0, p.energy - Math.min(30, totalAuto * 4)), stressLevel: Math.min(100, p.stressLevel + Math.min(20, totalAuto * 2)) };
    }
    if (!isTwoParent && isActive) {
      return { ...p, stressLevel: Math.min(100, p.stressLevel + Math.min(15, awayHours * 1.5)) };
    }
    return p;
  });

  const ageDaysNow = Math.max(0, Math.floor((settings.simulatedTimeMs - baby.birthTimestamp) / 86400000));
  const who = isTwoParent
    ? `${parents.find(p => p.id !== activeParentId)?.name || 'Your partner'} (simulated)`
    : 'Simulated baseline care';
  const skippedDays = skippedMs / 86400000;
  const hoursLabel = skippedDays >= 1
    ? `About ${Math.round(skippedDays + awayHours / 24)} days`
    : awayHours >= 1 ? `${awayHours.toFixed(1)} hours` : `${Math.round(awayHours * 60)} minutes`;
  const summaryEvent: SimulationEvent = {
    id: makeId('away', settings.simulatedTimeMs),
    timestamp: settings.simulatedTimeMs,
    dayNumber: ageDaysNow,
    type: 'away_summary',
    source: 'autopilot',
    title: 'While you were away',
    description: autopilotOn
      ? `${hoursLabel} passed.${skippedDays >= 1 ? ' Only the last day is shown in detail.' : ''} ${who} handled ${summary.feeds} feed${summary.feeds === 1 ? '' : 's'}, ${summary.changes} nappy change${summary.changes === 1 ? '' : 's'}, ${summary.burps} burp${summary.burps === 1 ? '' : 's'} and ${summary.settles} settle${summary.settles === 1 ? '' : 's'}. ${baby.name} is yours again now.`
      : `${hoursLabel} passed with no care while you were away.`,
    educationalNote: EVENT_NOTES.away_summary.body,
    severity: 'info',
    resolved: true,
    resolvedAt: settings.simulatedTimeMs
  };
  events = [summaryEvent, ...events];

  void startSimTime;
  return {
    baby,
    babyState: state,
    parents,
    userProfile: input.userProfile,
    settings: { ...settings, lastRealTimestampMs: nowRealMs },
    events,
    actionRecords: actions,
    milestones,
    dayLogs,
    processedSimMs: totalSimMs,
    autopilotSummary: autopilotOn ? summary : null
  };
}
