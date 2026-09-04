/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JourneyReport } from './report';

/**
 * THE SIX-MONTH STORY — deterministic version.
 * Written entirely from the JourneyReport (which is computed from records), so it works
 * offline and with no AI key. When the AI is available it may retell this more warmly,
 * but it is given the same facts and nothing else.
 */
export function buildFactualStory(r: JourneyReport): string[] {
  const p: string[] = [];
  p.push(
    `${r.babyName} is ${r.developmentalAgeLabel}. Over ${r.careDays} days of caring you gave ${r.totals.feeds} feeds, ` +
    `changed ${r.totals.diaperChanges} nappies, and were there for ${r.totals.nightWakings} night wakings. ` +
    `${r.babyName} slept about ${r.totals.sleepHours} hours and cried for about ${r.totals.cryingHours} hours of it.`
  );
  if (r.milestonesReached.length) {
    p.push(`Along the way: ${r.milestonesReached.join(', ').toLowerCase()}.`);
  }
  if (r.memory.length) p.push(r.memory.join(' '));
  if (r.strengths.length) p.push(`What went well — ${r.strengths.join(' ')}`);
  if (r.challenges.length) p.push(`What was hard — ${r.challenges.join(' ')}`);
  if (r.patterns.length) p.push(`Patterns worth knowing about yourself — ${r.patterns.join(' ')}`);
  p.push(
    'None of this is a grade. The simulation compressed six months into weeks and left out most of what makes real ' +
    'babies hard and wonderful. What it can show is how it felt to be needed at 3 am, to hand over, to come back. ' +
    'Real babies vary, and so do real parents.'
  );
  return p;
}
