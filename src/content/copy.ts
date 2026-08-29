/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CONTENT LAYER
 * -------------
 * Every user-facing educational or factual sentence lives here so it can be audited in one place.
 *
 * status:
 *   'heuristic'  — describes what the SIMULATION does. Not a claim about real babies.
 *   'general'    — widely-known, low-risk general parenting information, written cautiously.
 *                  Still to be cross-checked against authoritative sources in M3.
 *   'reviewed'   — checked against the cited sources (none yet; M3 will populate `sources`).
 *
 * Rules: no vital-sign numbers, no diagnostic language, no "evidence-based" / "science" labels,
 * no organisation is quoted unless it appears in `sources` with a URL.
 */

export type ContentStatus = 'heuristic' | 'general' | 'reviewed';

export interface ContentItem {
  id: string;
  title: string;
  summary: string;
  body: string;
  status: ContentStatus;
  sources: { label: string; url: string }[];
}

export const DISCLAIMER_SHORT =
  'Parenthood is an educational simulation, not medical advice or a substitute for professional guidance.';

export const DISCLAIMER_LONG =
  'Parenthood is an educational simulation. The baby, its needs and its development are modelled by simple rules that are ' +
  'meant to feel realistic, not to be medically accurate. Nothing in this app is medical advice, a diagnosis, or a measure of ' +
  'whether anyone is ready to be a parent. For real babies, talk to a qualified health professional.';

export const EDUCATION_BADGE = 'Simulation note';

export const EDUCATIONAL_TOPICS: ContentItem[] = [
  {
    id: 'fourth_trimester',
    title: 'The first weeks are a big adjustment',
    summary: 'Newborns are adapting to life outside the womb, and so are you.',
    body:
      'In the earliest weeks many babies settle best with closeness, gentle motion and quiet. Responding to a newborn when they ' +
      'cry is generally considered part of normal care, not "spoiling". In this simulation, comfort recovers fastest when needs ' +
      'are met promptly.',
    status: 'general',
    sources: []
  },
  {
    id: 'wake_windows',
    title: 'Awake for too long, harder to settle',
    summary: 'Young babies can only stay awake comfortably for short stretches.',
    body:
      'The simulation tracks how long the baby has been awake. Past the stage-appropriate window, sleepiness rises quickly and ' +
      'comfort drops, which is why an over-tired baby in the app fights sleep and cries more. Real babies vary a lot; the exact ' +
      'windows here are simulation settings, not medical thresholds.',
    status: 'heuristic',
    sources: []
  },
  {
    id: 'cluster_feeding',
    title: 'Feeds are not evenly spaced',
    summary: 'Some periods bring frequent, closely spaced feeds.',
    body:
      'Babies do not feed on a fixed timer. In the simulation, hunger rises at a rate that depends on developmental stage, ' +
      'temperament and recent feeds, and difficult periods can bunch feeds together. Treat the rhythm you see as an illustration, ' +
      'not a schedule for a real baby.',
    status: 'heuristic',
    sources: []
  },
  {
    id: 'startle',
    title: 'Sudden movements and startles',
    summary: 'Newborns often startle at sudden sounds or the feeling of falling.',
    body:
      'A startle can wake a sleeping baby. The simulation models this only loosely (as part of light-sleep waking). Safe-sleep ' +
      'practices for real babies should come from a qualified source, not from this app.',
    status: 'general',
    sources: []
  },
  {
    id: 'parental_fatigue',
    title: 'Broken sleep affects you too',
    summary: 'Fragmented sleep wears down patience and energy.',
    body:
      'The simulation tracks your sleep debt, stress and energy. Night care raises sleep debt; a short break or a partner taking ' +
      'a shift lowers stress. This is a simple model of a real effect, not a measurement of your wellbeing.',
    status: 'heuristic',
    sources: []
  }
];

/** Explanations attached to simulation events. Keyed so the engine never embeds prose. */
export const EVENT_NOTES: Record<string, ContentItem> = {
  crying_spell: {
    id: 'crying_spell',
    title: 'Why is the baby crying?',
    summary: 'Crying is the main way a young baby signals a need.',
    body:
      'In the simulation, sustained crying starts when comfort drops low for several minutes. The usual causes here are hunger, ' +
      'a wet or dirty nappy, trapped wind after a feed, or being awake too long. The app deliberately does not always tell you ' +
      'which one — working it out is part of the experience.',
    status: 'heuristic',
    sources: []
  },
  night_waking: {
    id: 'night_waking',
    title: 'Night waking',
    summary: 'Young babies commonly wake at night to feed.',
    body:
      'Newborns in the simulation wake more readily at night when hungry, uncomfortable or gassy, and their sleep stretches are ' +
      'shorter than an adult\'s. As the simulated baby grows, night stretches gradually lengthen.',
    status: 'general',
    sources: []
  },
  sleep_regression: {
    id: 'sleep_regression',
    title: 'A rough patch of sleep',
    summary: 'Around four months many babies go through a period of more frequent waking.',
    body:
      'The simulation includes a bounded window of more fragmented sleep in the 4–6 month stage. It is temporary in the app. ' +
      'Whether and how a real baby experiences this varies.',
    status: 'general',
    sources: []
  },
  diaper_blowout: {
    id: 'diaper_blowout',
    title: 'A messy change',
    summary: 'Sometimes a nappy just does not hold.',
    body: 'A full change of clothes is modelled as taking longer and costing a little more comfort and parent energy.',
    status: 'heuristic',
    sources: []
  },
  rolls_over: {
    id: 'rolls_over',
    title: 'Rolling over',
    summary: 'A movement milestone that changes sleep-safety considerations.',
    body:
      'Once a real baby can roll, sleep-safety guidance (for example about swaddling) changes. Ask a qualified source; the ' +
      'simulation only records the milestone.',
    status: 'general',
    sources: []
  },
  developmental_milestone: {
    id: 'developmental_milestone',
    title: 'A milestone',
    summary: 'Milestones in the app unlock by simulated age and current state.',
    body:
      'Real developmental timing varies widely from baby to baby. The ages used here are simulation settings and will be ' +
      'aligned with reviewed developmental ranges in a later update.',
    status: 'heuristic',
    sources: []
  },
  away_summary: {
    id: 'away_summary',
    title: 'While you were away',
    summary: 'The baby kept living while the app was closed.',
    body:
      'Basic care while you are away is handled by a simulated caregiver (your partner in a two-parent household, or baseline ' +
      'care in a single-parent one). It covers only feeds, changes, burps and settling, is deliberately slower than an ' +
      'attentive parent, and stops before you return so the baby still needs you.',
    status: 'heuristic',
    sources: []
  }
};

export const MILESTONE_NOTES: Record<string, string> = {
  focus_faces: 'Newborns tend to look longest at faces held close. Timing varies; the app uses an early simulated age.',
  first_social_smile: 'A smile in response to you, rather than a reflex. Often appears in the first couple of months.',
  tummy_head_lift: 'Brief head lifts during supervised tummy time build neck and shoulder strength.',
  cooing_sounds: 'Vowel-like sounds are an early step toward speech. Responding to them encourages more.',
  hands_to_mouth: 'Finding their own hands is an early self-soothing skill.',
  longer_night_stretch: 'Longer sleep stretches tend to come gradually as babies grow. Every baby is different.',
  entering_social_infant: 'The simulated baby now stays awake longer and interacts more.',
  entering_infant_4_6mo: 'The simulated baby is stronger, more curious and starting to move.',
  rolls_over: 'Rolling changes what is safe at sleep time. Seek proper guidance for a real baby.',
  first_solid_food: 'The app lets you offer tastes of solids in the 4–6 month stage. When to start with a real baby is a question for a health professional.',
  sleep_regression_4mo: 'A temporary period of more night waking modelled in the 4–6 month stage.'
};
