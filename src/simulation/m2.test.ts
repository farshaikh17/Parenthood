/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { advanceDevelopmentalAge, DEFAULT_COMPRESSION_SCHEDULE, estimateRealDays, formatDevelopmentalAge, isJourneyComplete, rateForAge } from './clock';
import { SimulationEngine, STAGE_TUNING } from './engine';
import { INITIAL_MILESTONES } from './initialData';
import { accumulateAction, accumulateTick, getDayLog } from './dayLog';
import { runAwayCatchup } from './autopilot';
import { createMockBaby, createMockState, createMockParents, createMockSettings, createMockUserProfile } from './testUtils';
import { Baby, BabyState, DayLog, Parent, SimulationEvent } from '../types';

describe('M2 — compression clock', () => {
  it('default schedule fits six months into roughly six to eight real weeks', () => {
    const days = estimateRealDays(DEFAULT_COMPRESSION_SCHEDULE);
    expect(days).toBeGreaterThanOrEqual(40);
    expect(days).toBeLessThanOrEqual(56);
  });
  it('early weeks are slower than later months', () => {
    expect(rateForAge(3, DEFAULT_COMPRESSION_SCHEDULE)).toBeLessThan(rateForAge(150, DEFAULT_COMPRESSION_SCHEDULE));
  });
  it('advances developmental age across a stage boundary correctly', () => {
    // 1 real day at age 6: 0.5 day at 2x reaches 7, remaining 0.5 day at 3x → 8.5
    expect(advanceDevelopmentalAge(6, 86400000, DEFAULT_COMPRESSION_SCHEDULE)).toBeCloseTo(8.5, 5);
  });
  it('journey completes at ~6 months developmental age', () => {
    expect(isJourneyComplete(createMockBaby({ developmentalAgeDays: 181 }))).toBe(false);
    expect(isJourneyComplete(createMockBaby({ developmentalAgeDays: 182 }))).toBe(true);
  });
  it('formats developmental age in plain language', () => {
    expect(formatDevelopmentalAge(1)).toBe('1 day old');
    expect(formatDevelopmentalAge(21)).toBe('about 3 weeks old');
    expect(formatDevelopmentalAge(120)).toBe('about 4 months old'); // 120 days ≈ 3.9 months — rounds to the nearest month
    expect(formatDevelopmentalAge(182)).toBe('about 6 months old');
  });
  it('engine advances developmental age using the settings schedule', () => {
    const settings = createMockSettings({ compressionSchedule: DEFAULT_COMPRESSION_SCHEDULE });
    const r = SimulationEngine.tick(createMockBaby(), createMockState(), createMockParents(), 'parent_1', settings, 12 * 3600 * 1000, [], INITIAL_MILESTONES);
    expect(r.nextBaby.developmentalAgeDays).toBeCloseTo(1, 5); // half a real day × 2 = 1 dev day
  });
});

/**
 * Realism harness: an attentive parent who responds within ~10 minutes to clear needs.
 * Runs a full real-time day and checks the day looks like a newborn day, not a stress machine.
 */
function runAttentiveDay(ageDays: number, hours = 24) {
  let baby: Baby = createMockBaby({ developmentalAgeDays: ageDays });
  let state: BabyState = createMockState({ hunger: 30, sleepiness: 30, comfort: 85 });
  let parents: Parent[] = createMockParents();
  let events: SimulationEvent[] = [];
  let logs: DayLog[] = [];
  const start = new Date(2026, 0, 15, 8, 0, 0).getTime(); // start 8 AM so we cross a night
  let settings = createMockSettings({ simulatedTimeMs: start, nighttimeAlertsEnabled: true, compressionSchedule: [{ untilAgeDays: 999, devDaysPerRealDay: 0 }] });
  const step = 5 * 60 * 1000;
  let minutesNeedy = 0;
  let feeds = 0;
  for (let t = 0; t < hours * 60 * 60 * 1000; t += step) {
    const r = SimulationEngine.tick(baby, state, parents, 'parent_1', settings, step, events, INITIAL_MILESTONES);
    logs = accumulateTick(logs, 0, state, r.nextState, 5, r.nextParents, r.newEvents);
    baby = r.nextBaby; state = r.nextState; parents = r.nextParents; events = [...r.newEvents, ...events];
    settings = { ...settings, simulatedTimeMs: settings.simulatedTimeMs + step };

    // A sensible parent does not wake a sleeping baby
    const needy = !state.isSleeping && (state.hunger > 60 || state.diaperSoiled > 50 || state.gasDiscomfort > 40 || state.sleepiness > 60);
    minutesNeedy = needy ? minutesNeedy + 5 : 0;
    if (minutesNeedy >= 10) {
      let action: string | null = null;
      let params: any = {};
      if (state.hunger > 60) { action = 'feed'; params = { amountMl: 90 }; }
      else if (state.diaperSoiled > 50) action = 'change_diaper';
      else if (state.gasDiscomfort > 40) action = 'burp';
      else if (!state.isSleeping && state.sleepiness > 60) action = state.gasDiscomfort > 55 || state.hunger > 55 ? 'cuddle' : 'put_to_sleep';
      if (action) {
        const a = SimulationEngine.applyAction(action, baby, state, parents, 'parent_1', settings, params);
        state = a.nextState; parents = a.nextParents; logs = accumulateAction(logs, 0, a.record);
        if (action === 'feed') {
          feeds++;
          const b = SimulationEngine.applyAction('burp', baby, state, parents, 'parent_1', settings, {});
          state = b.nextState; parents = b.nextParents;
          if (!state.isSleeping && state.sleepiness > 45) {
            const c = SimulationEngine.applyAction('cuddle', baby, state, parents, 'parent_1', settings, {});
            state = c.nextState; parents = c.nextParents;
          }
        }
        minutesNeedy = 0;
      }
    }
  }
  const day = getDayLog(logs, 0);
  return { feeds, sleepHours: day.sleepMinutes / 60, cryingMinutes: day.cryingMinutes, nightWakings: day.nightWakings, parents, state };
}

describe('M2 — a newborn day with an attentive parent looks like a newborn day', () => {
  it('newborn (day 5): 7–13 feeds, 10–18 h sleep, limited crying, some night waking (averaged over 3 days)', () => {
    const runs = [0, 1, 2].map(() => runAttentiveDay(5));
    const mean = (k: 'feeds' | 'sleepHours' | 'cryingMinutes' | 'nightWakings') => runs.reduce((s, r) => s + r[k], 0) / runs.length;
    expect(mean('feeds')).toBeGreaterThanOrEqual(7);
    expect(mean('feeds')).toBeLessThanOrEqual(13);
    expect(mean('sleepHours')).toBeGreaterThanOrEqual(10);
    expect(mean('sleepHours')).toBeLessThanOrEqual(18);
    expect(mean('cryingMinutes')).toBeLessThan(120);
    expect(mean('nightWakings')).toBeGreaterThanOrEqual(1);
  });
  it('4–6 month infant (day 150): fewer feeds and fewer night wakings than a newborn (averaged over 4 days)', () => {
    const avg = (age: number) => {
      const runs = [0, 1, 2, 3].map(() => runAttentiveDay(age));
      return {
        feeds: runs.reduce((s, r) => s + r.feeds, 0) / runs.length,
        nightWakings: runs.reduce((s, r) => s + r.nightWakings, 0) / runs.length
      };
    };
    const d = avg(150);
    const n = avg(5);
    expect(d.feeds).toBeLessThan(n.feeds);
    expect(d.nightWakings).toBeLessThan(n.nightWakings);
  });
  it('tuning table is ordered sensibly by stage', () => {
    expect(STAGE_TUNING.newborn.wakeWindowMinutes).toBeLessThan(STAGE_TUNING.social_infant.wakeWindowMinutes);
    expect(STAGE_TUNING.social_infant.nightStretchMinutes).toBeLessThan(STAGE_TUNING.infant_4_6mo.nightStretchMinutes);
  });
});

describe('M2 — away autopilot over a full real night is survivable', () => {
  it('8 real hours away at real time (1x): baby was fed and slept a reasonable amount', () => {
    const start = new Date(2026, 0, 15, 22, 0, 0).getTime();
    const r = runAwayCatchup({
      baby: createMockBaby({ developmentalAgeDays: 10 }),
      babyState: createMockState({ hunger: 30, sleepiness: 60, comfort: 80 }),
      parents: createMockParents(),
      userProfile: createMockUserProfile(),
      settings: createMockSettings({ simulatedTimeMs: start, timeSpeed: 1, lastRealTimestampMs: start, nighttimeAlertsEnabled: true }),
      events: [], actionRecords: [], milestones: INITIAL_MILESTONES, dayLogs: []
    }, start + 8 * 3600 * 1000);
    const sleep = r.dayLogs.reduce((s, d) => s + d.sleepMinutes, 0) / 60;
    const crying = r.dayLogs.reduce((s, d) => s + d.cryingMinutes, 0);
    expect(r.autopilotSummary!.feeds).toBeGreaterThanOrEqual(2);
    expect(sleep).toBeGreaterThanOrEqual(3);
    expect(crying).toBeLessThan(150);
    expect(r.babyState.comfort).toBeGreaterThan(20);
  });
});

describe('M2 — long absences keep the journey on schedule', () => {
  it('3 real days away: last 24 h simulated in detail, developmental age still advances for all 3 days', () => {
    const start = new Date(2026, 0, 15, 8, 0, 0).getTime();
    const r = runAwayCatchup({
      baby: createMockBaby({ developmentalAgeDays: 0 }),
      babyState: createMockState(),
      parents: createMockParents(),
      userProfile: createMockUserProfile(),
      settings: createMockSettings({ simulatedTimeMs: start, timeSpeed: 1, lastRealTimestampMs: start, compressionSchedule: DEFAULT_COMPRESSION_SCHEDULE }),
      events: [], actionRecords: [], milestones: INITIAL_MILESTONES, dayLogs: []
    }, start + 3 * 24 * 3600 * 1000);
    expect(r.processedSimMs).toBe(24 * 3600 * 1000);
    expect(r.baby.developmentalAgeDays).toBeCloseTo(6, 1); // 3 real days × 2 (first-week rate)
    expect(r.settings.simulatedTimeMs).toBe(start + 3 * 24 * 3600 * 1000);
    expect(r.events[0].description).toMatch(/About 3 days/);
  });
});

describe('M3 — events carry a state snapshot for grounded explanations', () => {
  it('a crying spell records what the simulation looked like', () => {
    const state = createMockState({ hunger: 85, comfort: 15, cryingMinutesContinuous: 6, isSleeping: false });
    const r = SimulationEngine.tick(createMockBaby({ developmentalAgeDays: 3 }), state, createMockParents(), 'parent_1', createMockSettings(), 60 * 1000, [], INITIAL_MILESTONES);
    const cry = r.newEvents.find(e => e.type === 'crying_spell');
    expect(cry).toBeDefined();
    expect(cry!.snapshot).toBeDefined();
    expect(cry!.snapshot!.hunger).toBeGreaterThanOrEqual(85);
    expect(cry!.snapshot!.developmentalAgeDays).toBe(3);
    expect(cry!.description).not.toMatch(/Primary needs/); // the cause is not announced
  });
});
