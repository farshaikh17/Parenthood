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

/** Sources consulted for the M2 tuning ranges. Cited on the items that use them. */
export const SOURCES = {
  nhsFirstDays: { label: 'NHS — Breastfeeding: the first few days (feeds "at least 8 to 12 times, or more, every 24 hours" in the first weeks)', url: 'https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/breastfeeding/the-first-few-days/' },
  nhsSleepPatterns: { label: 'NHS — Your baby\'s sleep patterns (newborns ~8–18 h/day in short bursts; some 3–6-month-olds sleep 8 h+ at night)', url: 'https://www.nhs.uk/best-start-in-life/baby/baby-basics/newborn-and-baby-sleeping-advice-for-parents/your-babys-sleep-patterns/' },
  whoFeeding: { label: 'WHO — Infant and young child feeding (exclusive breastfeeding for 6 months; complementary foods from about 6 months; responsive feeding day and night)', url: 'https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding' },
  whoGrowth: { label: 'WHO — Child growth standards: weight-for-age', url: 'https://www.who.int/tools/child-growth-standards/standards/weight-for-age' },
  nhsSoothing: { label: 'NHS — Soothing a crying baby (common reasons: hunger, wet/dirty nappy, tiredness, wanting a cuddle, wind, too hot/cold, boredom, overstimulation; crying tends to increase from ~2 weeks and reduce around 3 months; afternoons/evenings common)', url: 'https://www.nhs.uk/baby/caring-for-a-newborn/soothing-a-crying-baby/' },
  nhsSafeSleep: { label: 'NHS — Reduce the risk of sudden infant death syndrome (back to sleep, own cot in your room, clear cot, firm flat mattress, room 16–20 °C, move baby onto their back if they roll until they can roll both ways)', url: 'https://www.nhs.uk/baby/caring-for-a-newborn/reduce-the-risk-of-sudden-infant-death-syndrome/' },
  cdc2mo: { label: 'CDC — Milestones by 2 months (smiles when you talk to or smile at them; makes sounds other than crying; holds head up when on tummy)', url: 'https://www.cdc.gov/ncbddd/actearly/milestones/milestones-2mo.html' },
  cdc4mo: { label: 'CDC — Milestones by 4 months (cooing "oooo/aahh"; brings hands to mouth; pushes up onto forearms on tummy)', url: 'https://www.cdc.gov/ncbddd/actearly/milestones/milestones-4mo.html' },
  nhsUrgentHelp: { label: 'NHS — When to get urgent medical help for babies and children under 5 (trust your instincts; call 999/A&E for breathing difficulty, blue/grey/mottled skin, non-fading rash, fever 38 °C+ under 3 months, weak high-pitched or continuous cry, hard to wake, no wee in 12 h, seizure; call 111 if worried)', url: 'https://www.nhs.uk/baby/health/when-to-get-urgent-medical-help-for-babies-and-children-under-5/' },
  cdc6mo: { label: 'CDC — Milestones by 6 months (rolls from tummy to back; laughs; takes turns making sounds)', url: 'https://www.cdc.gov/ncbddd/actearly/milestones/milestones-6mo.html' }
};

/** Educational note for the parent self-care action. */
export const SELF_CARE_NOTE: ContentItem = {
  id: 'self_care',
  title: 'When you have had enough',
  summary: 'Feeling you cannot take any more happens to a lot of parents.',
  body:
    'Guidance for real parents: put the baby down somewhere safe (their cot or pram), close the door, go into another room and ' +
    'take a few minutes to calm down. It is not shameful to ask for help. In the simulation, a break lowers your stress a little ' +
    'and the baby waits safely.',
  status: 'reviewed',
  sources: [SOURCES.nhsSoothing]
};

export const TIME_MODEL_EXPLAINER =
  'Care happens in real time: feeds really are a couple of hours apart and night is your night. ' +
  'Development is compressed so the six-month journey takes about six to eight real weeks — the newborn weeks pass slowest.';

export const EDUCATIONAL_TOPICS: ContentItem[] = [
  {
    id: 'fourth_trimester',
    title: 'The first weeks are a big adjustment',
    summary: 'Newborns are adapting to life outside the womb, and so are you.',
    body:
      'Guidance lists the usual reasons a baby cries — hunger, a wet or dirty nappy, tiredness, wanting a cuddle, wind, being too ' +
      'hot or cold, boredom, overstimulation — and suggests holding the baby close, moving gently, swaying, talking or singing, ' +
      'or stroking their back. Crying tends to increase from around two weeks and ease around three months, often worst in the ' +
      'afternoon and evening. In this simulation, comfort recovers fastest when needs are met promptly.',
    status: 'reviewed',
    sources: [SOURCES.nhsSoothing]
  },
  {
    id: 'wake_windows',
    title: 'Awake for too long, harder to settle',
    summary: 'Young babies can only stay awake comfortably for short stretches.',
    body:
      'The simulation tracks how long the baby has been awake. Past the stage-appropriate window, sleepiness rises quickly and ' +
      'comfort drops, which is why an over-tired baby in the app fights sleep and cries more. Newborn sleep totals vary widely ' +
      '(guidance describes anywhere from about 8 to 18 hours a day, in short bursts). The exact windows here are simulation ' +
      'settings, not medical thresholds.',
    status: 'general',
    sources: [SOURCES.nhsSleepPatterns]
  },
  {
    id: 'cluster_feeding',
    title: 'Feeds are not evenly spaced',
    summary: 'Some periods bring frequent, closely spaced feeds.',
    body:
      'Babies do not feed on a fixed timer. Guidance for the first weeks describes at least 8–12 feeds in 24 hours, often more, ' +
      'and feeding whenever the baby shows hunger. In the simulation, hunger rises at a rate that depends on developmental stage, ' +
      'temperament and recent feeds, so feeds land roughly every two to three hours for a newborn, further apart later. ' +
      'Treat the rhythm you see as an illustration, not a schedule for a real baby.',
    status: 'general',
    sources: [SOURCES.nhsFirstDays, SOURCES.whoFeeding]
  },
  {
    id: 'startle',
    title: 'Sudden movements and startles',
    summary: 'Newborns often startle at sudden sounds or the feeling of falling.',
    body:
      'A startle can wake a sleeping baby. The simulation models this only loosely (as part of light-sleep waking). For real ' +
      'babies, safer-sleep guidance is: on their back, in their own cot in your room, a clear cot with a firm flat mattress, and ' +
      'not too hot. This app is not the place to learn it.',
    status: 'reviewed',
    sources: [SOURCES.nhsSafeSleep]
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

/** Health honesty note shown wherever a mild episode appears. */
export const HEALTH_NOTE: ContentItem = {
  id: 'health_limits',
  title: 'What the simulation does and does not model',
  summary: 'Only mild, common, self-limiting episodes — never anything you would need a doctor for.',
  body:
    'The app models a blocked-up nose that makes feeding and sleeping harder, and the odd windy, unsettled day. It never ' +
    'shows temperatures or diagnoses, and it never models serious illness. For a real baby, guidance is to trust your ' +
    'instincts and get urgent help for signs such as difficulty breathing, blue/grey/mottled skin, a rash that does not fade ' +
    'when pressed, a high temperature in a young baby, a weak or high-pitched continuous cry, being hard to wake, or no wet ' +
    'nappies for 12 hours — and to call for advice whenever you are worried.',
  status: 'reviewed',
  sources: [SOURCES.nhsUrgentHelp]
};

/** Explanations attached to simulation events. Keyed so the engine never embeds prose. */
export const EVENT_NOTES: Record<string, ContentItem> = {
  crying_spell: {
    id: 'crying_spell',
    title: 'Why is the baby crying?',
    summary: 'Crying is the main way a young baby signals a need.',
    body:
      'In the simulation, sustained crying starts when comfort drops low for several minutes. The usual causes here — hunger, ' +
      'a wet or dirty nappy, trapped wind after a feed, or being awake too long — match the common reasons listed in general ' +
      'guidance (which also mentions wanting a cuddle, temperature, boredom and overstimulation). The app deliberately does not ' +
      'always tell you which one — working it out is part of the experience.',
    status: 'reviewed',
    sources: [SOURCES.nhsSoothing]
  },
  night_waking: {
    id: 'night_waking',
    title: 'Night waking',
    summary: 'Young babies commonly wake at night to feed.',
    body:
      'Newborns in the simulation wake more readily at night when hungry, uncomfortable or gassy, and their sleep stretches are ' +
      'shorter than an adult\'s. As the simulated baby grows, night stretches gradually lengthen; guidance notes that by three to ' +
      'six months some babies sleep eight hours or longer at night — and many do not.',
    status: 'general',
    sources: [SOURCES.nhsSleepPatterns]
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
      'Rolling from tummy to back is listed among things most babies do by around six months. Once a real baby starts rolling, ' +
      'safer-sleep guidance says to move them onto their back until they can roll both ways by themselves. The simulation only ' +
      'records the milestone.',
    status: 'reviewed',
    sources: [SOURCES.cdc6mo, SOURCES.nhsSafeSleep]
  },
  developmental_milestone: {
    id: 'developmental_milestone',
    title: 'A milestone',
    summary: 'Milestones in the app unlock by simulated age and current state.',
    body:
      'Real developmental timing varies widely from baby to baby. The ages used in the simulation sit inside the "most babies ' +
      'by this age" windows published for 2, 4 and 6 months, but a real baby reaching something earlier or later is not a ' +
      'verdict on anything.',
    status: 'reviewed',
    sources: [SOURCES.cdc2mo, SOURCES.cdc4mo, SOURCES.cdc6mo]
  },
  growth_spurt: {
    id: 'growth_spurt',
    title: 'A hungrier couple of days',
    summary: 'Feeds bunch up for a while, then settle again.',
    body:
      'Guidance for the first weeks describes feeds that are frequent and uneven, often more than 8–12 a day. The ' +
      'simulation adds short "hungrier" spells at a few points in the early months: hunger rises faster, feeds come closer ' +
      'together, and then it passes. It is not a sign anything is wrong.',
    status: 'general',
    sources: [SOURCES.nhsFirstDays]
  },
  evening_fussiness: {
    id: 'evening_fussiness',
    title: 'The evening stretch',
    summary: 'Crying often peaks in the afternoon and evening in the early weeks.',
    body:
      'Guidance notes that crying tends to increase from around two weeks, ease around three months, and that afternoons ' +
      'and evenings are the most common hard times. The simulation makes those hours harder during that window, and ' +
      'sometimes nothing works straight away — that is modelled on purpose.',
    status: 'reviewed',
    sources: [SOURCES.nhsSoothing]
  },
  illness_start: {
    id: 'illness_start',
    title: 'A snuffly few days',
    summary: 'A blocked nose makes feeding and sleeping harder for a while.',
    body: HEALTH_NOTE.body,
    status: 'reviewed',
    sources: [SOURCES.nhsUrgentHelp]
  },
  illness_end: {
    id: 'illness_end',
    title: 'Back to normal',
    summary: 'The episode has passed.',
    body: 'Mild episodes in the simulation always pass on their own within a few days.',
    status: 'heuristic',
    sources: []
  },
  vaccination: {
    id: 'vaccination',
    title: 'Routine vaccination',
    summary: 'A routine appointment; the baby may be unsettled afterwards.',
    body:
      'Vaccination schedules differ by country and are set by your local health service — the simulation uses a generic ' +
      'early-months appointment and models a day of being a little more unsettled afterwards. It says nothing about which ' +
      'vaccines or when; ask your health service.',
    status: 'general',
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
  focus_faces: '"Looks at your face" is among the things most babies do by two months. The app unlocks it early; timing varies.',
  first_social_smile: '"Smiles when you talk to or smile at them" is listed for most babies by two months. In the app it appears around six weeks.',
  tummy_head_lift: '"Holds head up when on tummy" is listed for most babies by two months. Short, supervised tummy time while awake.',
  cooing_sounds: 'Cooing sounds like "oooo" and "aahh" are listed for most babies by four months. Answering them encourages more.',
  hands_to_mouth: '"Brings hands to mouth" is listed for most babies by four months. An early self-soothing skill.',
  longer_night_stretch: 'Longer sleep stretches tend to come gradually; some babies sleep eight hours or longer at night by three to six months, many do not.',
  entering_social_infant: 'The simulated baby now stays awake longer and interacts more.',
  entering_infant_4_6mo: 'The simulated baby is stronger, more curious and starting to move.',
  rolls_over: '"Rolls from tummy to back" is listed for most babies by six months. Once rolling starts, safer-sleep guidance changes — move them onto their back until they can roll both ways.',
  first_solid_food: 'Complementary foods are recommended from about six months, alongside milk. When to start with a real baby is a question for a health professional.',
  sleep_regression_4mo: 'A temporary period of more night waking modelled in the 4–6 month stage. Real babies vary.'
};
