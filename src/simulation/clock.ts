/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Baby, CompressionStage, SimulationSettings } from '../types';

/**
 * SIMULATION CLOCK — how six months fit into six-to-eight weeks
 * ---------------------------------------------------------------
 * Two clocks run at once:
 *
 * 1. The CARE clock (`settings.simulatedTimeMs`). In production it runs at real time
 *    (timeSpeed = 1), so feeds really are a couple of hours apart and night is the
 *    user's real night. Developer mode can speed it up for testing.
 *
 * 2. The DEVELOPMENT clock (`baby.developmentalAgeDays`). It advances faster than the
 *    care clock according to a configurable schedule, so the baby grows through the
 *    first six months in roughly six to eight real weeks. Stage, milestones, growth and
 *    stage-dependent rates all use developmental age.
 *
 * The user sees both: "Day 12 with Emma" (real days of caring) and "about 6 weeks old"
 * (developmental age). The schedule is data, not code — change it in settings.
 */

export const JOURNEY_END_AGE_DAYS = 182; // ~6 months

/** Default schedule: slower early (the newborn weeks should feel long), faster later. ≈ 44 real days total. */
export const DEFAULT_COMPRESSION_SCHEDULE: CompressionStage[] = [
  { untilAgeDays: 7, devDaysPerRealDay: 2 },     // first week: 3.5 real days
  { untilAgeDays: 28, devDaysPerRealDay: 3 },    // weeks 2–4: 7 real days
  { untilAgeDays: 56, devDaysPerRealDay: 4 },    // weeks 5–8: 7 real days
  { untilAgeDays: 119, devDaysPerRealDay: 4.5 }, // months 3–4: 14 real days
  { untilAgeDays: 182, devDaysPerRealDay: 5 }    // months 4–6: ~12.6 real days
];

export function rateForAge(ageDays: number, schedule: CompressionStage[]): number {
  for (const s of schedule) if (ageDays < s.untilAgeDays) return s.devDaysPerRealDay;
  return schedule.length > 0 ? schedule[schedule.length - 1].devDaysPerRealDay : 1;
}

/** Advance developmental age by a slice of care-clock time, honouring stage boundaries inside the slice. */
export function advanceDevelopmentalAge(ageDays: number, deltaSimMs: number, schedule: CompressionStage[]): number {
  let remainingDays = deltaSimMs / 86400000;
  let age = ageDays;
  let guard = 0;
  while (remainingDays > 1e-9 && guard++ < 20) {
    const rate = rateForAge(age, schedule);
    const stage = schedule.find(s => age < s.untilAgeDays);
    const roomDays = stage ? stage.untilAgeDays - age : Infinity;
    const stepDev = remainingDays * rate;
    if (stepDev <= roomDays) { age += stepDev; break; }
    age = stage!.untilAgeDays;
    remainingDays -= roomDays / rate;
  }
  return Math.min(age, JOURNEY_END_AGE_DAYS + 30); // allow a little overrun; UI treats >= END as complete
}

/** Estimated total real days for the whole schedule (for disclosure in onboarding/settings). */
export function estimateRealDays(schedule: CompressionStage[]): number {
  let prev = 0;
  let total = 0;
  for (const s of schedule) {
    total += (s.untilAgeDays - prev) / s.devDaysPerRealDay;
    prev = s.untilAgeDays;
  }
  return Math.round(total);
}

export function getDevelopmentalAgeDays(baby: Baby): number {
  return Math.max(0, Math.floor(baby.developmentalAgeDays ?? 0));
}

/** Real (care-clock) days since birth: "Day 12 with Emma". */
export function getCareDayNumber(baby: Baby, settings: SimulationSettings): number {
  return Math.max(0, Math.floor((settings.simulatedTimeMs - baby.birthTimestamp) / 86400000));
}

export function formatDevelopmentalAge(ageDays: number): string {
  if (ageDays < 14) return `${ageDays} day${ageDays === 1 ? '' : 's'} old`;
  if (ageDays < 84) return `about ${Math.floor(ageDays / 7)} weeks old`;
  const months = Math.floor(ageDays / 30.4);
  return `about ${months} month${months === 1 ? '' : 's'} old`;
}

export function isJourneyComplete(baby: Baby): boolean {
  return (baby.developmentalAgeDays ?? 0) >= JOURNEY_END_AGE_DAYS;
}
