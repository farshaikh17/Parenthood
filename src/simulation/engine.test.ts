/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { SimulationEngine, getDevelopmentalStage } from './engine';
import { Parent, SimulationEvent } from '../types';
import { INITIAL_MILESTONES } from './initialData';
import { createMockBaby, createMockState, createMockParents, createMockSettings, createMockUserProfile } from './testUtils';

describe('SimulationEngine', () => {
  describe('SimulationEngine.tick()', () => {
    it('returns unmodified input when delta is zero or negative (no-op)', () => {
      const baby = createMockBaby();
      const state = createMockState();
      const parents = createMockParents();
      const settings = createMockSettings();
      const events: SimulationEvent[] = [];
      const milestones = [...INITIAL_MILESTONES];

      const resZero = SimulationEngine.tick(baby, state, parents, 'parent_1', settings, 0, events, milestones);
      expect(resZero.nextBaby).toEqual(baby);
      expect(resZero.nextState).toEqual(state);
      expect(resZero.nextParents).toEqual(parents);
      expect(resZero.newEvents).toEqual([]);
      expect(resZero.updatedMilestones).toEqual(milestones);

      const resNeg = SimulationEngine.tick(baby, state, parents, 'parent_1', settings, -5000, events, milestones);
      expect(resNeg.nextBaby).toEqual(baby);
      expect(resNeg.nextState).toEqual(state);
      expect(resNeg.nextParents).toEqual(parents);
      expect(resNeg.newEvents).toEqual([]);
    });

    it('advances hunger and sleepiness in expected direction when awake over elapsed time', () => {
      const baby = createMockBaby();
      const state = createMockState({ hunger: 10, sleepiness: 10, isSleeping: false });
      const parents = createMockParents();
      const settings = createMockSettings();

      // Tick 30 minutes of simulated time (1800000 ms)
      const result = SimulationEngine.tick(
        baby,
        state,
        parents,
        'parent_1',
        settings,
        30 * 60 * 1000,
        [],
        INITIAL_MILESTONES
      );

      expect(result.nextState.hunger).toBeGreaterThan(state.hunger);
      expect(result.nextState.sleepiness).toBeGreaterThan(state.sleepiness);
      expect(result.nextState.awakeMinutesElapsed).toBe(state.awakeMinutesElapsed + 30);
      expect(result.nextState.sleepMinutesElapsed).toBe(0);
    });

    it('reduces sleepiness over elapsed time when baby is sleeping', () => {
      const baby = createMockBaby();
      const state = createMockState({ 
        sleepiness: 80, 
        isSleeping: true, 
        sleepMinutesElapsed: 5,
        hunger: 10,
        diaperSoiled: 0,
        gasDiscomfort: 0
      });
      const parents = createMockParents();
      const settings = createMockSettings();

      // Advance 20 minutes of sleep
      const result = SimulationEngine.tick(
        baby,
        state,
        parents,
        'parent_1',
        settings,
        20 * 60 * 1000,
        [],
        INITIAL_MILESTONES
      );

      expect(result.nextState.sleepiness).toBeLessThan(state.sleepiness);
      expect(result.nextState.sleepMinutesElapsed).toBe(state.sleepMinutesElapsed + 20);
    });

    it('causes comfort to decrease as distress (hunger/gas/overtiredness) accumulates', () => {
      const baby = createMockBaby();
      const lowDistressState = createMockState({ hunger: 10, diaperSoiled: 0, gasDiscomfort: 0, sleepiness: 20 });
      const highDistressState = createMockState({ hunger: 80, diaperSoiled: 70, gasDiscomfort: 60, sleepiness: 95 });
      const parents = createMockParents();
      const settings = createMockSettings();

      const lowResult = SimulationEngine.tick(baby, lowDistressState, parents, 'parent_1', settings, 1000, [], INITIAL_MILESTONES);
      const highResult = SimulationEngine.tick(baby, highDistressState, parents, 'parent_1', settings, 1000, [], INITIAL_MILESTONES);

      expect(lowResult.nextState.comfort).toBeGreaterThan(highResult.nextState.comfort);
      expect(highResult.nextState.mood).toMatch(/fussy|active_crying|inconsolable/);
    });

    it('wakes baby up if hunger or distress crosses wake thresholds', () => {
      const baby = createMockBaby();
      const sleepingHungryState = createMockState({ 
        isSleeping: true, 
        sleepMinutesElapsed: 30,
        hunger: 80,
        sleepiness: 30 
      });
      const parents = createMockParents();
      const settings = createMockSettings();

      const result = SimulationEngine.tick(baby, sleepingHungryState, parents, 'parent_1', settings, 60 * 1000, [], INITIAL_MILESTONES);
      expect(result.nextState.isSleeping).toBe(false);
    });
  });

  describe('SimulationEngine.applyAction()', () => {
    it('feed action reduces hunger, updates lastFedTimestamp, adds slight gas, and increases comfort', () => {
      const baby = createMockBaby();
      const state = createMockState({ hunger: 80, gasDiscomfort: 10, comfort: 40 });
      const parents = createMockParents();
      const settings = createMockSettings({ simulatedTimeMs: 1700050000000 });

      const result = SimulationEngine.applyAction('feed', baby, state, parents, 'parent_1', settings, { amountMl: 90 });

      expect(result.nextState.hunger).toBeLessThan(state.hunger);
      expect(result.nextState.comfort).toBeGreaterThan(state.comfort);
      expect(result.nextState.lastFedTimestamp).toBe(settings.simulatedTimeMs);
      expect(result.nextState.gasDiscomfort).toBeGreaterThan(state.gasDiscomfort);
      expect(result.record.actionType).toBe('feed');
      expect(result.record.effectiveness).toBe('excellent');
    });

    it('burp action relieves gasDiscomfort, updates lastBurpedTimestamp, and increases comfort', () => {
      const baby = createMockBaby();
      const state = createMockState({ gasDiscomfort: 60, comfort: 50 });
      const parents = createMockParents();
      const settings = createMockSettings({ simulatedTimeMs: 1700060000000 });

      const result = SimulationEngine.applyAction('burp', baby, state, parents, 'parent_1', settings);

      expect(result.nextState.gasDiscomfort).toBeLessThan(state.gasDiscomfort);
      expect(result.nextState.comfort).toBeGreaterThan(state.comfort);
      expect(result.nextState.lastBurpedTimestamp).toBe(settings.simulatedTimeMs);
      expect(result.record.actionType).toBe('burp');
    });

    it('change_diaper action resets diaperSoiled to 0, sets diaperType to clean, and updates lastDiaperTimestamp', () => {
      const baby = createMockBaby();
      const state = createMockState({ diaperSoiled: 85, diaperType: 'dirty', comfort: 40 });
      const parents = createMockParents();
      const settings = createMockSettings({ simulatedTimeMs: 1700070000000 });

      const result = SimulationEngine.applyAction('change_diaper', baby, state, parents, 'parent_1', settings);

      expect(result.nextState.diaperSoiled).toBe(0);
      expect(result.nextState.diaperType).toBe('clean');
      expect(result.nextState.lastDiaperTimestamp).toBe(settings.simulatedTimeMs);
      expect(result.nextState.comfort).toBeGreaterThan(state.comfort);
      expect(result.record.actionType).toBe('change_diaper');
      expect(result.record.effectiveness).toBe('excellent');
    });

    it('cuddle / rock increases comfort and reduces continuous crying', () => {
      const baby = createMockBaby();
      const state = createMockState({ comfort: 40, cryingMinutesContinuous: 10 });
      const parents = createMockParents();
      const settings = createMockSettings();

      const result = SimulationEngine.applyAction('cuddle', baby, state, parents, 'parent_1', settings);

      expect(result.nextState.comfort).toBeGreaterThan(state.comfort);
      expect(result.nextState.cryingMinutesContinuous).toBeLessThan(state.cryingMinutesContinuous);
      expect(result.record.actionType).toBe('cuddle');
    });

    it('put_to_sleep fails if baby is too hungry or gassy, but succeeds when ready', () => {
      const baby = createMockBaby();
      const hungryState = createMockState({ hunger: 75, sleepiness: 80, isSleeping: false });
      const readyState = createMockState({ hunger: 20, gasDiscomfort: 10, sleepiness: 75, isSleeping: false });
      const parents = createMockParents();
      const settings = createMockSettings();

      const hungryResult = SimulationEngine.applyAction('put_to_sleep', baby, hungryState, parents, 'parent_1', settings);
      expect(hungryResult.record.effectiveness).toBe('ineffective');
      expect(hungryResult.nextState.isSleeping).toBe(false);

      const readyResult = SimulationEngine.applyAction('put_to_sleep', baby, readyState, parents, 'parent_1', settings);
      expect(readyResult.record.effectiveness).toBe('excellent');
      expect(readyResult.nextState.isSleeping).toBe(true);
    });

    it('parent_break relieves active parent stress and boosts energy', () => {
      const baby = createMockBaby();
      const state = createMockState();
      const parents = createMockParents();
      const settings = createMockSettings();

      const result = SimulationEngine.applyAction('parent_break', baby, state, parents, 'parent_1', settings);

      const activeParentAfter = result.nextParents.find(p => p.id === 'parent_1')!;
      const originalActiveParent = parents.find(p => p.id === 'parent_1')!;

      expect(activeParentAfter.stressLevel).toBeLessThan(originalActiveParent.stressLevel);
      expect(activeParentAfter.energy).toBeGreaterThan(originalActiveParent.energy);
      expect(result.record.actionType).toBe('parent_break');
    });
  });

  describe('SimulationEngine.calculateScore()', () => {
    it('returns score report with all scores clamped between 0 and 100', () => {
      const normalState = createMockState({ comfort: 85, hunger: 20, gasDiscomfort: 10 });
      const parents = createMockParents();
      const profile = createMockUserProfile();
      const events: SimulationEvent[] = [
        {
          id: 'ev1',
          timestamp: 1700000000000,
          dayNumber: 1,
          type: 'night_waking',
          title: 'Night Waking',
          description: 'Baby woke up',
          educationalNote: 'Newborn sleep cycle note',
          severity: 'warning',
          resolved: true,
        },
      ];

      const report = SimulationEngine.calculateScore(normalState, parents, [], events, profile);

      expect(report.babyWellbeingScore).toBeGreaterThanOrEqual(0);
      expect(report.babyWellbeingScore).toBeLessThanOrEqual(100);

      expect(report.parentWellbeingScore).toBeGreaterThanOrEqual(0);
      expect(report.parentWellbeingScore).toBeLessThanOrEqual(100);

      expect(report.parentingConfidenceScore).toBeGreaterThanOrEqual(0);
      expect(report.parentingConfidenceScore).toBeLessThanOrEqual(100);

      expect(report.relationshipScore).toBeGreaterThanOrEqual(0);
      expect(report.relationshipScore).toBeLessThanOrEqual(100);

      expect(report.overallCareScore).toBeGreaterThanOrEqual(0);
      expect(report.overallCareScore).toBeLessThanOrEqual(100);

      expect(report.responsivenessRatePercent).toBe(100);
      expect(report.nighttimeWakingsHandled).toBe(1);
    });

    it('correctly clamps edge cases with extreme values', () => {
      const worstState = createMockState({ comfort: 0, hunger: 100, gasDiscomfort: 100 });
      const extremeParents: Parent[] = [
        {
          id: 'parent_1',
          name: 'Exhausted',
          role: 'primary',
          workStatus: 'parental_leave',
          stressLevel: 100,
          energy: 0,
          sleepDebtHours: 20,
          confidence: 0,
          knowledgeScore: 0,
        },
        {
          id: 'parent_2',
          name: 'Partner',
          role: 'secondary',
          workStatus: 'full_time',
          stressLevel: 100,
          energy: 0,
          sleepDebtHours: 20,
          confidence: 0,
          knowledgeScore: 0,
        },
      ];
      const profile = createMockUserProfile();
      const unresolvedEvents: SimulationEvent[] = [
        {
          id: 'ev2',
          timestamp: 1700000000000,
          dayNumber: 1,
          type: 'crying_spell',
          title: 'Crying',
          description: 'Crying',
          educationalNote: 'Infant crying note',
          severity: 'urgent',
          resolved: false,
        },
      ];

      const reportWorst = SimulationEngine.calculateScore(worstState, extremeParents, [], unresolvedEvents, profile);

      expect(reportWorst.babyWellbeingScore).toBeGreaterThanOrEqual(0);
      expect(reportWorst.babyWellbeingScore).toBeLessThanOrEqual(100);
      expect(reportWorst.parentWellbeingScore).toBeGreaterThanOrEqual(0);
      expect(reportWorst.parentWellbeingScore).toBeLessThanOrEqual(100);
      expect(reportWorst.overallCareScore).toBeGreaterThanOrEqual(0);
      expect(reportWorst.responsivenessRatePercent).toBe(0);

      const bestState = createMockState({ comfort: 100, hunger: 0, gasDiscomfort: 0 });
      const bestParents: Parent[] = [
        {
          id: 'parent_1',
          name: 'Refreshed',
          role: 'solo',
          workStatus: 'parental_leave',
          stressLevel: 0,
          energy: 100,
          sleepDebtHours: 0,
          confidence: 100,
          knowledgeScore: 100,
        },
      ];
      const singleProfile = createMockUserProfile({ householdType: 'single' });

      const reportBest = SimulationEngine.calculateScore(bestState, bestParents, [], [], singleProfile);

      expect(reportBest.babyWellbeingScore).toBe(100);
      expect(reportBest.parentWellbeingScore).toBe(100);
      expect(reportBest.overallCareScore).toBe(100);
      expect(reportBest.responsivenessRatePercent).toBe(100);
    });
  });

  describe('Developmental Stages & 4-6 Month Mechanics', () => {
    it('correctly maps age in days to developmental stages', () => {
      expect(getDevelopmentalStage(0)).toBe('newborn');
      expect(getDevelopmentalStage(14)).toBe('newborn');
      expect(getDevelopmentalStage(55)).toBe('newborn'); // 7.8 weeks
      expect(getDevelopmentalStage(56)).toBe('social_infant'); // 8 weeks
      expect(getDevelopmentalStage(80)).toBe('social_infant');
      expect(getDevelopmentalStage(118)).toBe('social_infant'); // ~16.8 weeks
      expect(getDevelopmentalStage(119)).toBe('infant_4_6mo'); // 17 weeks
      expect(getDevelopmentalStage(150)).toBe('infant_4_6mo');
      expect(getDevelopmentalStage(180)).toBe('infant_4_6mo');
    });

    it('social_infant stage has wider safe wake windows (slower sleepiness build-up) than newborn', () => {
      const newbornBaby = createMockBaby({ birthTimestamp: 1700000000000 });
      const socialBaby = createMockBaby({ developmentalAgeDays: 70 }); // 70 days old
      const state = createMockState({ hunger: 10, sleepiness: 10, isSleeping: false });
      const parents = createMockParents();
      const settings = createMockSettings({ simulatedTimeMs: 1700000000000 });

      const newbornResult = SimulationEngine.tick(newbornBaby, state, parents, 'parent_1', settings, 30 * 60 * 1000, [], INITIAL_MILESTONES);
      const socialResult = SimulationEngine.tick(socialBaby, state, parents, 'parent_1', settings, 30 * 60 * 1000, [], INITIAL_MILESTONES);

      // Social infant accumulates sleepiness at a lower rate per unit time than newborn
      expect(socialResult.nextState.sleepiness).toBeLessThan(newbornResult.nextState.sleepiness);
    });

    it('infant_4_6mo stage introduces solidFoodHunger accumulation alongside milk feeding', () => {
      const infantBaby = createMockBaby({ developmentalAgeDays: 181 }); // ~6 months: solids interest begins
      const state = createMockState({ hunger: 20, solidFoodHunger: 10, isSleeping: false });
      const parents = createMockParents();
      const settings = createMockSettings({ simulatedTimeMs: 1700000000000 });

      const result = SimulationEngine.tick(infantBaby, state, parents, 'parent_1', settings, 60 * 60 * 1000, [], INITIAL_MILESTONES);

      expect(result.nextState.solidFoodHunger).toBeDefined();
      expect(result.nextState.solidFoodHunger).toBeGreaterThan(10);
      expect(result.nextState.hunger).toBeGreaterThan(20);
    });

    it('feed_solids action reduces solidFoodHunger and unlocks first_solid_food milestone', () => {
      const infantBaby = createMockBaby({ developmentalAgeDays: 181 });
      const state = createMockState({ hunger: 50, solidFoodHunger: 75, comfort: 60 });
      const parents = createMockParents();
      const settings = createMockSettings({ simulatedTimeMs: 1700000000000 });

      const result = SimulationEngine.applyAction('feed_solids', infantBaby, state, parents, 'parent_1', settings, { foodType: 'Sweet Potato Puree' });

      expect(result.nextState.solidFoodHunger).toBeLessThan(75);
      expect(result.nextState.lastSolidsTimestamp).toBe(settings.simulatedTimeMs);
      expect(result.record.actionType).toBe('feed_solids');
      expect(result.record.details).toContain('Sweet Potato Puree');
    });

    it('unlocks developmental stage entry milestones during tick', () => {
      const socialBaby = createMockBaby({ developmentalAgeDays: 60 }); // 60 days
      const state = createMockState();
      const parents = createMockParents();
      const settings = createMockSettings({ simulatedTimeMs: 1700000000000 });

      const result = SimulationEngine.tick(socialBaby, state, parents, 'parent_1', settings, 1000, [], INITIAL_MILESTONES);
      const socialMilestone = result.updatedMilestones.find(m => m.id === 'entering_social_infant');
      expect(socialMilestone?.unlocked).toBe(true);
    });
  });

  describe('Nighttime Awakening Simulation', () => {
    it('wakes baby and logs a night_waking event during nighttime hours (10PM - 7AM)', () => {
      // 11:30 PM (23:30) timestamp
      const nightDate = new Date(2026, 0, 15, 23, 30, 0);
      const simTime = nightDate.getTime();
      const newbornBaby = createMockBaby({ developmentalAgeDays: 7, birthTimestamp: simTime - (7 * 24 * 60 * 60 * 1000) }); // 7 days old
      // Newborn sleeping with hunger just under the nighttime wake threshold (70); the tick pushes it over
      const state = createMockState({
        isSleeping: true,
        sleepMinutesElapsed: 30,
        hunger: 69,
        sleepiness: 30
      });
      const parents = createMockParents();
      const settings = createMockSettings({ simulatedTimeMs: simTime, nighttimeAlertsEnabled: true });

      const result = SimulationEngine.tick(newbornBaby, state, parents, 'parent_1', settings, 5 * 60 * 1000, [], INITIAL_MILESTONES);

      expect(result.nextState.isSleeping).toBe(false);
      expect(result.newEvents.length).toBeGreaterThan(0);
      const nightWakeEvent = result.newEvents.find(e => e.type === 'night_waking');
      expect(nightWakeEvent).toBeDefined();
      expect(nightWakeEvent?.severity).toBe('warning');
      expect(nightWakeEvent?.resolved).toBe(false);
    });

    it('uses existing nighttimeWakingsHandled scoring field for resolved night wakings', () => {
      const state = createMockState();
      const parents = createMockParents();
      const profile = createMockUserProfile();

      const events: SimulationEvent[] = [
        {
          id: 'nw_1',
          timestamp: 1700000000000,
          dayNumber: 3,
          type: 'night_waking',
          title: 'Nighttime Awakening',
          description: 'Baby woke up for milk',
          educationalNote: 'Newborn night waking',
          severity: 'warning',
          resolved: true,
          resolvedAt: 1700000600000
        },
        {
          id: 'nw_2',
          timestamp: 1700003600000,
          dayNumber: 3,
          type: 'night_waking',
          title: 'Nighttime Awakening',
          description: 'Baby woke up for diaper',
          educationalNote: 'Newborn night waking',
          severity: 'warning',
          resolved: false
        }
      ];

      const report = SimulationEngine.calculateScore(state, parents, [], events, profile);
      expect(report.nighttimeWakingsHandled).toBe(1);
    });
  });

  describe('Baby Memory & Caregiver Effectiveness Tracking', () => {
    it('updates caregiver soothing effectiveness stats deterministically after soothing actions', () => {
      const baby = createMockBaby();
      let state = createMockState({ comfort: 40, cryingMinutesContinuous: 3 });
      const parents = createMockParents();
      const settings = createMockSettings();

      // Action 1: Cuddle by parent_1
      const res1 = SimulationEngine.applyAction('cuddle', baby, state, parents, 'parent_1', settings);
      state = res1.nextState;

      expect(state.caregiverEffectiveness).toBeDefined();
      const stats1 = state.caregiverEffectiveness?.['parent_1'];
      expect(stats1?.sootheAttempts).toBe(1);
      expect(stats1?.sootheSuccesses).toBe(1);
      expect(stats1?.affinityScore).toBeGreaterThanOrEqual(50);

      // Action 2: Rock by parent_1
      const res2 = SimulationEngine.applyAction('rock', baby, state, parents, 'parent_1', settings);
      const stats2 = res2.nextState.caregiverEffectiveness?.['parent_1'];
      expect(stats2?.sootheAttempts).toBe(2);
      expect(stats2?.sootheSuccesses).toBe(2);
      expect(stats2?.affinityScore).toBeGreaterThanOrEqual(stats1!.affinityScore);
    });

    it('caregiver with a strong track record provides a higher comfort bonus and confidence boost', () => {
      const baby = createMockBaby();
      const parents = createMockParents();
      const settings = createMockSettings();

      // Fresh caregiver state (no track record)
      const freshState = createMockState({ comfort: 40, hunger: 20, gasDiscomfort: 10 });
      const freshResult = SimulationEngine.applyAction('cuddle', baby, freshState, parents, 'parent_1', settings);

      // Experienced caregiver state (high affinity)
      const experiencedState = createMockState({
        comfort: 40,
        hunger: 20,
        gasDiscomfort: 10,
        caregiverEffectiveness: {
          parent_1: {
            sootheAttempts: 8,
            sootheSuccesses: 8,
            avgTimeToComfortMinutes: 2,
            affinityScore: 92,
            lastSoothedTimestamp: settings.simulatedTimeMs - 100000
          }
        }
      });
      const expResult = SimulationEngine.applyAction('cuddle', baby, experiencedState, parents, 'parent_1', settings);

      // Comfort should be higher with the caregiver track-record bonus
      expect(expResult.nextState.comfort).toBeGreaterThan(freshResult.nextState.comfort);

      // Parent confidence gain should also be higher
      const freshParent = freshResult.nextParents.find(p => p.id === 'parent_1')!;
      const expParent = expResult.nextParents.find(p => p.id === 'parent_1')!;
      expect(expParent.confidence).toBeGreaterThan(freshParent.confidence);
    });
  });
});
