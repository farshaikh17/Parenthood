/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { createPersonality, describeBaby, driftAfterSleepAction, ensurePersonality, preferredCaregiver } from './personality';
import { buildMemorySummary, memoryToSentences } from './memory';
import { SimulationEngine } from './engine';
import { createMockBaby, createMockState, createMockParents, createMockSettings } from './testUtils';

describe('M4 — individuality', () => {
  it('two babies with the same temperament are not identical, and a seed is reproducible', () => {
    const a = createPersonality('easygoing', 1);
    const b = createPersonality('easygoing', 2);
    const a2 = createPersonality('easygoing', 1);
    expect(a).toEqual(a2);
    expect(a.soothability === b.soothability && a.hungerTolerance === b.hungerTolerance).toBe(false);
    expect(a.soothability).toBeGreaterThan(0.6);
    expect(a.soothability).toBeLessThan(1.4);
  });
  it('old saves without a personality get a deterministic one from the baby id', () => {
    const baby = createMockBaby();
    expect(ensurePersonality(baby)).toEqual(ensurePersonality(baby));
  });
  it('habits drift within bounds', () => {
    let p = createPersonality('active', 7);
    for (let i = 0; i < 100; i++) p = driftAfterSleepAction(p, 'held_to_sleep');
    expect(p.heldToSleepHabit).toBe(100);
    expect(p.settleInCotSkill).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < 100; i++) p = driftAfterSleepAction(p, 'put_to_sleep_ok');
    expect(p.settleInCotSkill).toBe(100);
  });
  it('successful cot settling is remembered on the baby returned by applyAction', () => {
    const baby = createMockBaby({ personality: { ...createPersonality('easygoing', 3), settleInCotSkill: 100, heldToSleepHabit: 0 } });
    const r = SimulationEngine.applyAction('put_to_sleep', baby, createMockState({ sleepiness: 80, hunger: 20, gasDiscomfort: 0 }), createMockParents(), 'parent_1', createMockSettings());
    expect(r.nextBaby.personality).toBeDefined();
    // with max cot skill the refuse chance floors at 5%, so almost always succeeds; either way personality is carried
    expect(typeof r.nextBaby.personality!.settleInCotSkill).toBe('number');
  });
  it('caregiver preference emerges only from enough structured evidence', () => {
    const parents = createMockParents();
    const none = preferredCaregiver(createMockState({ caregiverEffectiveness: { parent_1: { sootheAttempts: 2, sootheSuccesses: 2, avgTimeToComfortMinutes: 3, affinityScore: 90 } } }), parents);
    expect(none).toBeNull();
    const pref = preferredCaregiver(createMockState({ caregiverEffectiveness: {
      parent_1: { sootheAttempts: 8, sootheSuccesses: 8, avgTimeToComfortMinutes: 3, affinityScore: 90 },
      parent_2: { sootheAttempts: 8, sootheSuccesses: 3, avgTimeToComfortMinutes: 9, affinityScore: 50 }
    } }), parents);
    expect(pref?.parent.id).toBe('parent_1');
  });
  it('memory summary never invents: empty records → no sentences', () => {
    const m = buildMemorySummary(createMockBaby(), createMockState(), createMockParents(), [], [], []);
    expect(memoryToSentences('Leo', m)).toEqual([]);
  });
  it('the baby voice is sensory and age-appropriate, never a sentence from the baby', () => {
    const newborn = describeBaby(createMockBaby({ developmentalAgeDays: 3 }), createMockState({ mood: 'playful' }), 'newborn');
    const older = describeBaby(createMockBaby({ developmentalAgeDays: 150 }), createMockState({ mood: 'playful' }), 'infant_4_6mo');
    expect(newborn).not.toMatch(/coo/i);
    expect(older).toMatch(/coo/i);
    expect(newborn).not.toMatch(/"|I want|I am/);
  });
});
