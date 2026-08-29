/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Baby, BabyPersonality, BabyState, CareActionRecord, DevelopmentalStage, Parent, TemperamentType } from '../types';
import { TEMPERAMENTS } from './initialData';

/**
 * BABY INDIVIDUALITY
 * ------------------
 * The five temperament templates are only a starting point. At creation each baby gets
 * hidden personality parameters = template ± bounded random jitter, so two "easygoing"
 * babies are not the same baby. Some parameters then DRIFT with experience (what the
 * caregivers actually do), within safe bounds. The user never sees a class name; they
 * learn the baby by caring for them.
 */

function jitter(base: number, spread: number, rnd: () => number): number {
  return base + (rnd() * 2 - 1) * spread;
}

/** Small seeded PRNG so a baby's personality is reproducible from its seed (useful for tests and sync). */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createPersonality(temperament: TemperamentType, seed: number): BabyPersonality {
  const t = TEMPERAMENTS[temperament] || TEMPERAMENTS.easygoing;
  const rnd = seededRandom(seed);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return {
    seed,
    soothability: clamp(jitter(t.soothabilityMultiplier, 0.12, rnd), 0.6, 1.4),
    hungerTolerance: clamp(jitter(t.hungerToleranceMultiplier, 0.12, rnd), 0.6, 1.4),
    sleepCycleFactor: clamp(jitter(t.sleepCycleDurationMinutes / 50, 0.15, rnd), 0.7, 1.4),
    sensitivity: clamp(jitter(temperament === 'sensitive' ? 0.75 : temperament === 'intense' ? 0.65 : temperament === 'cautious' ? 0.6 : 0.4, 0.15, rnd), 0.1, 0.95),
    sociability: clamp(jitter(temperament === 'active' ? 0.75 : temperament === 'easygoing' ? 0.65 : 0.5, 0.15, rnd), 0.1, 0.95),
    cryIntensity: t.cryIntensity,
    settleInCotSkill: 30,
    heldToSleepHabit: 30
  };
}

/** Old saves have no personality: build one from the temperament, deterministic from the baby id. */
export function ensurePersonality(baby: Baby): BabyPersonality {
  if (baby.personality) return baby.personality;
  let h = 0;
  for (const ch of baby.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return createPersonality(baby.temperament, h);
}

/**
 * Experience drift — called by the engine after a sleep-related action.
 * Bounded, slow, and reversible: habits form, they are not destiny.
 */
export function driftAfterSleepAction(p: BabyPersonality, action: 'put_to_sleep_ok' | 'put_to_sleep_fail' | 'held_to_sleep'): BabyPersonality {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  switch (action) {
    case 'put_to_sleep_ok':
      return { ...p, settleInCotSkill: clamp(p.settleInCotSkill + 3), heldToSleepHabit: clamp(p.heldToSleepHabit - 1) };
    case 'put_to_sleep_fail':
      return { ...p, settleInCotSkill: clamp(p.settleInCotSkill - 1) };
    case 'held_to_sleep':
      return { ...p, heldToSleepHabit: clamp(p.heldToSleepHabit + 2), settleInCotSkill: clamp(p.settleInCotSkill - 0.5) };
  }
}

/** Which caregiver, if any, this baby has come to settle more easily with. Derived, never stored. */
export function preferredCaregiver(state: BabyState, parents: Parent[]): { parent: Parent; margin: number } | null {
  const stats = state.caregiverEffectiveness || {};
  const ranked = parents
    .map(p => ({ p, s: stats[p.id] }))
    .filter(x => x.s && x.s.sootheAttempts >= 5)
    .sort((a, b) => (b.s!.affinityScore) - (a.s!.affinityScore));
  if (ranked.length < 2) return null;
  const margin = ranked[0].s!.affinityScore - ranked[1].s!.affinityScore;
  return margin >= 15 ? { parent: ranked[0].p, margin } : null;
}

/**
 * Structured memory: facts the journal and the UI may state, all computed from records.
 * Nothing here is invented; if there is no data, the field is null.
 */
export interface BabyMemorySummary {
  preferredCaregiverName: string | null;
  usualSettleMethod: 'cuddle' | 'put_to_sleep' | null;
  averageResponseMinutes: number | null;   // how long crying spells lasted before a user action
  longestNightStretchMinutes: number | null;
  feedsPerDayRecent: number | null;
  settlesInCotEasily: boolean;
  prefersBeingHeld: boolean;
}

export function summarizeMemory(
  baby: Baby,
  state: BabyState,
  parents: Parent[],
  actions: CareActionRecord[],
  cryingSpellDurations: number[],
  longestNightStretchMinutes: number | null,
  feedsPerDayRecent: number | null
): BabyMemorySummary {
  const p = ensurePersonality(baby);
  const userActions = actions.filter(a => a.source !== 'autopilot');
  const cuddles = userActions.filter(a => a.actionType === 'cuddle' || a.actionType === 'rock').length;
  const cots = userActions.filter(a => a.actionType === 'put_to_sleep' && a.effectiveness !== 'ineffective').length;
  const pref = preferredCaregiver(state, parents);
  const avgResp = cryingSpellDurations.length >= 3
    ? Math.round(cryingSpellDurations.reduce((s, d) => s + d, 0) / cryingSpellDurations.length)
    : null;
  return {
    preferredCaregiverName: pref ? pref.parent.name : null,
    usualSettleMethod: cuddles + cots < 4 ? null : cuddles > cots * 1.5 ? 'cuddle' : cots > cuddles * 1.5 ? 'put_to_sleep' : null,
    averageResponseMinutes: avgResp,
    longestNightStretchMinutes,
    feedsPerDayRecent,
    settlesInCotEasily: p.settleInCotSkill >= 60,
    prefersBeingHeld: p.heldToSleepHabit >= 60
  };
}

/**
 * THE BABY'S "VOICE" — age-appropriate, sensory, never sentences.
 * Newborns cry and make small sounds; by 3–6 months there is cooing, squealing and
 * social responsiveness. This is what the dashboard and the Look action describe.
 */
export function describeBaby(baby: Baby, state: BabyState, stage: DevelopmentalStage): string {
  const p = ensurePersonality(baby);
  const loud = p.cryIntensity === 'piercing' || p.cryIntensity === 'loud';
  const older = stage !== 'newborn';
  switch (state.mood) {
    case 'sleeping_deep': return older ? 'Sleeping soundly, one arm flung out.' : 'Sleeping soundly, tiny breaths.';
    case 'sleeping_light': return p.sensitivity > 0.6 ? 'Light sleep — twitching at every sound.' : 'Light sleep, the odd whimper and twitch.';
    case 'drowsy': return older ? 'Heavy-eyed, rubbing their face, slowing down.' : 'Eyes glazing, little jerky yawns.';
    case 'quiet_alert': return older
      ? (p.sociability > 0.6 ? 'Calm and watching you closely, ready to smile.' : 'Calm, looking around, taking things in.')
      : 'Wide-eyed and still, studying the light and your face.';
    case 'playful': return older
      ? (p.sociability > 0.6 ? 'Cooing and squealing at you, kicking with the whole body.' : 'Soft coos, hands finding each other, kicking.')
      : 'Alert and wriggly, small sounds, arms waving.';
    case 'fussy': return older ? 'Grizzling, arching, turning away from things.' : 'Grizzling, squirming, face screwing up now and then.';
    case 'active_crying': return loud
      ? 'A hard, rising cry that fills the room.'
      : 'Crying in bursts, catching breath in between.';
    case 'inconsolable': return loud
      ? 'Screaming, red-faced, rigid — nothing is reaching them yet.'
      : 'Exhausted, hiccuping cries, beyond settling easily.';
    default: return 'Awake.';
  }
}
