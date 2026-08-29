/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { SimulationEngine, cryingPeakMultiplier, DIFFICULT_PERIODS } from './engine';
import { INITIAL_MILESTONES } from './initialData';
import { createMockBaby, createMockState, createMockParents, createMockSettings } from './testUtils';
import { autoJournalEntry, buildJourneyReport, buildWeekSummaries } from './report';

const noon = new Date(2026, 0, 15, 12, 0, 0).getTime();

describe('M5 — difficult periods', () => {
  it('crying peak is worst around 6 weeks and in the evening, absent outside the window', () => {
    expect(cryingPeakMultiplier(3, 12)).toBe(1);
    expect(cryingPeakMultiplier(42, 12)).toBeCloseTo(DIFFICULT_PERIODS.cryingPeak.maxPenaltyMultiplier, 5);
    expect(cryingPeakMultiplier(42, 19)).toBeGreaterThan(cryingPeakMultiplier(42, 12));
    expect(cryingPeakMultiplier(120, 19)).toBe(1);
  });
  it('a growth spurt starts once at a scheduled age and raises hunger rate', () => {
    const baby = createMockBaby({ developmentalAgeDays: 21 });
    const r = SimulationEngine.tick(baby, createMockState({ hunger: 10 }), createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon }), 60 * 1000, [], INITIAL_MILESTONES);
    expect(r.newEvents.some(e => e.type === 'growth_spurt')).toBe(true);
    expect(r.nextState.growthSpurtUntil).toBeGreaterThan(noon);
    // second tick: no duplicate
    const r2 = SimulationEngine.tick(r.nextBaby, r.nextState, createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon + 60000 }), 60 * 1000, r.newEvents, INITIAL_MILESTONES);
    expect(r2.newEvents.some(e => e.type === 'growth_spurt')).toBe(false);
    // hunger climbs faster during the spurt than for a baby without one
    const plain = SimulationEngine.tick(createMockBaby({ developmentalAgeDays: 25 }), createMockState({ hunger: 10 }), createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon }), 30 * 60000, [], INITIAL_MILESTONES);
    const spurt = SimulationEngine.tick(createMockBaby({ developmentalAgeDays: 25 }), createMockState({ hunger: 10, growthSpurtUntil: noon + 86400000 }), createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon }), 30 * 60000, [], INITIAL_MILESTONES);
    expect(spurt.nextState.hunger).toBeGreaterThan(plain.nextState.hunger);
  });
  it('a vaccination appointment happens once per scheduled age, in the daytime, and leaves the baby unsettled for a day', () => {
    const r = SimulationEngine.tick(createMockBaby({ developmentalAgeDays: 56 }), createMockState(), createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon }), 60000, [], INITIAL_MILESTONES);
    expect(r.newEvents.some(e => e.type === 'vaccination')).toBe(true);
    expect(r.nextState.postVaccineUntil).toBe(noon + 60000 + DIFFICULT_PERIODS.postVaccineHours * 3600000);
    expect(r.nextState.lastVaccinationAgeDays).toBe(56);
  });
});

describe('M5 — honest minimal health', () => {
  it('episodes end on their own and produce an end event; never any vital signs', () => {
    const state = createMockState({ healthState: 'sniffles', healthUntil: noon - 1 });
    const r = SimulationEngine.tick(createMockBaby({ developmentalAgeDays: 30 }), state, createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon }), 60000, [], INITIAL_MILESTONES);
    expect(r.nextState.healthState).toBe('healthy');
    const end = r.newEvents.find(e => e.type === 'illness_end');
    expect(end).toBeDefined();
    expect(JSON.stringify(r.newEvents)).not.toMatch(/°|temperature|fever|diagnos/i);
  });
  it('a snuffly baby feeds less effectively and the Look action says so in observable terms', () => {
    const state = createMockState({ hunger: 80, healthState: 'sniffles', healthUntil: noon + 86400000 });
    const fedIll = SimulationEngine.applyAction('feed', createMockBaby(), state, createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon }), { amountMl: 90 });
    const fedWell = SimulationEngine.applyAction('feed', createMockBaby(), createMockState({ hunger: 80 }), createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon }), { amountMl: 90 });
    expect(fedIll.nextState.hunger).toBeGreaterThan(fedWell.nextState.hunger);
    const look = SimulationEngine.applyAction('observe', createMockBaby(), state, createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon }));
    expect(look.feedbackMessage).toMatch(/snuffly/);
    expect(look.feedbackMessage).not.toMatch(/°|temperature/i);
  });
  it('illness episodes are capped', () => {
    const state = createMockState({ illnessEpisodes: DIFFICULT_PERIODS.illness.maxEpisodes });
    let anyStart = false;
    for (let i = 0; i < 200; i++) {
      const r = SimulationEngine.tick(createMockBaby({ developmentalAgeDays: 40 }), state, createMockParents(), 'parent_1', createMockSettings({ simulatedTimeMs: noon + i * 3600000 }), 3600000, [], INITIAL_MILESTONES);
      if (r.newEvents.some(e => e.type === 'illness_start')) anyStart = true;
    }
    expect(anyStart).toBe(false);
  });
});

describe('M6 — journal and report are built from records only', () => {
  it('auto journal entry states counts from the day log and nothing else', () => {
    const log = { dayNumber: 2, feeds: 9, diaperChanges: 6, sleepMinutes: 800, cryingMinutes: 40, nightWakings: 2, autopilotActions: 3, userActions: 12, parentStressSum: 300, parentStressSamples: 10 };
    const e = autoJournalEntry(createMockBaby(), 2, log, noon, INITIAL_MILESTONES, []);
    expect(e.reflection).toMatch(/Day 3: 9 feeds, 6 nappy changes, about 13.3 hours of sleep and 40 minutes of crying/);
    expect(e.reflection).toMatch(/2 night wakings/);
    expect(e.reflection).toMatch(/3 care actions happened while you were away/);
    expect(e.stats.derivedFromLog).toBe(true);
  });
  it('journey report: no data → no claims', () => {
    const r = buildJourneyReport(createMockBaby(), createMockState(), createMockParents(), null, [], [], [], INITIAL_MILESTONES);
    expect(r.strengths).toEqual([]);
    expect(r.challenges).toEqual([]);
    expect(r.weeks).toEqual([]);
    expect(r.totals.feeds).toBe(0);
  });
  it('week summaries group day logs by care week', () => {
    const logs = [0, 1, 2, 7, 8].map(d => ({ dayNumber: d, feeds: 8, diaperChanges: 6, sleepMinutes: 840, cryingMinutes: 30, nightWakings: 2, autopilotActions: 0, userActions: 10, parentStressSum: 200, parentStressSamples: 10 }));
    const w = buildWeekSummaries(logs, [], INITIAL_MILESTONES, createMockBaby());
    expect(w.length).toBe(2);
    expect(w[0].days).toBe(3);
    expect(w[1].days).toBe(2);
    expect(w[0].sleepHoursPerDay).toBe(14);
  });
});
