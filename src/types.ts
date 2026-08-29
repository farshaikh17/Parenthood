/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HouseholdType = 'single' | 'two_parent';

export type UserMotivation = 'planning_children' | 'newly_married' | 'curious_adult' | 'future_prep';

export type TemperamentType = 'easygoing' | 'sensitive' | 'intense' | 'active' | 'cautious';

export type DifficultyMode = 'realistic' | 'hardcore';

export type UnitSystem = 'imperial' | 'metric';

/** Who caused a record: the user, the off-screen autopilot, or the simulation itself. */
export type RecordSource = 'user' | 'autopilot' | 'system';

export type DevelopmentalStage = 'newborn' | 'social_infant' | 'infant_4_6mo';

export type BabyMood = 
  | 'sleeping_deep' 
  | 'sleeping_light' 
  | 'drowsy' 
  | 'quiet_alert' 
  | 'playful' 
  | 'fussy' 
  | 'active_crying' 
  | 'inconsolable';

/**
 * Health is deliberately minimal and honest: only mild, common, self-limiting episodes are
 * modelled, described by what a parent could observe (never vital signs or diagnoses).
 * 'sniffles' = a blocked nose making feeds and sleep harder; 'unsettled_tummy' = a windy, uncomfortable day.
 */
export type HealthCondition = 'healthy' | 'sniffles' | 'unsettled_tummy';

export type ActionCategory = 
  | 'feed' 
  | 'feed_solids'
  | 'burp' 
  | 'change_diaper' 
  | 'rock' 
  | 'cuddle' 
  | 'put_to_sleep' 
  | 'tummy_time' 
  | 'bathe' 
  | 'observe' 
  | 'parent_break'
  | 'switch_parent';

export interface Parent {
  id: string;
  name: string;
  role: 'primary' | 'secondary' | 'solo';
  workStatus: 'full_time' | 'part_time' | 'parental_leave' | 'homemaker';
  sleepDebtHours: number; // 0 to 20+
  stressLevel: number; // 0 to 100
  confidence: number; // 0 to 100
  knowledgeScore: number; // 0 to 100
  energy: number; // 0 to 100
}

export interface UserProfile {
  id: string;
  motivation: UserMotivation;
  householdType: HouseholdType;
  primaryParentName: string;
  partnerName?: string;
  onboardingCompleted: boolean;
  activeParentId: string;
  createdAt: number;
}

export interface BabyTemperament {
  type: TemperamentType;
  label: string;
  description: string;
  soothabilityMultiplier: number; // 0.7 (hard) to 1.3 (easy)
  hungerToleranceMultiplier: number;
  sleepCycleDurationMinutes: number;
  cryIntensity: 'gentle' | 'moderate' | 'loud' | 'piercing';
}

/** Hidden personality parameters. Derived from temperament + seed at creation; some drift with experience. */
export interface BabyPersonality {
  seed: number;
  soothability: number;      // 0.6 (hard to settle) – 1.4 (settles easily)
  hungerTolerance: number;   // 0.6 (hungry often) – 1.4 (goes longer)
  sleepCycleFactor: number;  // scales sleep cycle length
  sensitivity: number;       // 0–1: reacts to noise/light/handling
  sociability: number;       // 0–1: how much interaction they seek
  cryIntensity: 'gentle' | 'moderate' | 'loud' | 'piercing';
  settleInCotSkill: number;  // 0–100, grows with successful cot settling
  heldToSleepHabit: number;  // 0–100, grows when usually held to sleep
}

export interface Baby {
  id: string;
  name: string;
  sex: 'girl' | 'boy' | 'surprise';
  /** Canonical units are metric; display conversion happens in utils/units.ts */
  birthWeightGrams: number;
  birthLengthCm: number;
  temperament: TemperamentType;
  currentWeightGrams: number;
  currentLengthCm: number;
  birthTimestamp: number; // Care-clock timestamp of birth
  /** Developmental age (fractional days). Advances faster than the care clock per the compression schedule. */
  developmentalAgeDays: number;
  personality?: BabyPersonality;
}

/** One row of the compression schedule: until this developmental age, N developmental days pass per real day. */
export interface CompressionStage {
  untilAgeDays: number;
  devDaysPerRealDay: number;
}

export interface CaregiverEffectivenessStats {
  sootheAttempts: number;
  sootheSuccesses: number;
  avgTimeToComfortMinutes: number;
  lastSoothedTimestamp?: number;
  affinityScore: number; // 0 to 100
}

export interface BabyState {
  // Core dynamic physiological needs (0 to 100)
  hunger: number; // 0 = full, 100 = starving
  solidFoodHunger?: number; // 0 = satisfied, 100 = appetite for complementary solids (infant_4_6mo stage)
  sleepiness: number; // 0 = wide awake, 100 = overtired/exhausted
  diaperSoiled: number; // 0 = clean & dry, 100 = urgent heavy diaper
  diaperType: 'clean' | 'wet' | 'dirty' | 'both';
  gasDiscomfort: number; // 0 = comfortable, 100 = painful gas/colic
  comfort: number; // 0 = distressed/isolated, 100 = blissful/secure
  energy: number; // 0 = lethargic, 100 = hyper-alert
  
  // States
  isSleeping: boolean;
  sleepMinutesElapsed: number;
  awakeMinutesElapsed: number;
  healthState: HealthCondition;
  mood: BabyMood;

  // Caregiver memory / effectiveness (keyed by parentId)
  caregiverEffectiveness?: Record<string, CaregiverEffectivenessStats>;

  // Difficult periods & health (all bounded, all sim-time stamps)
  healthUntil?: number;          // when the current mild episode ends
  illnessEpisodes?: number;      // how many episodes so far (capped)
  growthSpurtUntil?: number;     // hunger runs higher until this time
  lastGrowthSpurtAgeDays?: number;
  postVaccineUntil?: number;     // a little more unsettled until this time
  lastVaccinationAgeDays?: number;
  lastEveningFussDay?: number;   // care-day number of the last evening-fussiness event
  
  // Time trackers
  lastFedTimestamp: number;
  lastSolidsTimestamp?: number;
  lastDiaperTimestamp: number;
  lastBurpedTimestamp: number;
  lastSootherTimestamp: number;
  lastTummyTimeTimestamp: number;
  cryingMinutesContinuous: number;
}

export interface SimulationSettings {
  difficulty: DifficultyMode;
  timeSpeed: number; // 1 = 1x real time, 60 = 1 min represents 1 hour, 300 = rapid
  isPaused: boolean;
  nighttimeAlertsEnabled: boolean;
  nighttimeQuietStartHour: number; // e.g., 22 (10 PM)
  nighttimeQuietEndHour: number; // e.g., 7 (7 AM)
  soundEffectsEnabled: boolean;
  simulatedTimeMs: number; // Current continuous time inside simulation
  lastRealTimestampMs?: number; // Real-world timestamp when last saved/ticked for catch-up continuity
  unitSystem: UnitSystem;
  /** Shows testing controls (speed multipliers, pause). Off for normal users. */
  developerMode: boolean;
  /** Away policy (Option B): simulation continues while closed, with bounded baseline autopilot care. */
  awayAutopilotEnabled: boolean;
  /** Upper bound of simulated time processed on reopen. */
  awayCatchupMaxSimHours: number;
  /** How developmental age maps onto real time. See simulation/clock.ts. */
  compressionSchedule: CompressionStage[];
}

export interface CareActionRecord {
  id: string;
  actionType: ActionCategory;
  timestamp: number;
  performedByParentId: string; // parent id, or 'autopilot'
  source: RecordSource;
  details: string;
  effectiveness: 'excellent' | 'moderate' | 'ineffective';
  deltaSummary: {
    hunger?: number;
    comfort?: number;
    sleepiness?: number;
    gas?: number;
    parentStress?: number;
    parentConfidence?: number;
  };
}

export interface EventSnapshot {
  hunger: number;
  sleepiness: number;
  gasDiscomfort: number;
  diaperSoiled: number;
  diaperType: BabyState['diaperType'];
  comfort: number;
  awakeMinutes: number;
  sleepMinutes: number;
  isSleeping: boolean;
  isNight: boolean;
  minutesSinceFeed: number;
  minutesSinceDiaper: number;
  developmentalAgeDays: number;
}

export interface SimulationEvent {
  id: string;
  timestamp: number;
  dayNumber: number;
  type: 
    | 'crying_spell' 
    | 'hunger_cue' 
    | 'diaper_blowout' 
    | 'cluster_feeding' 
    | 'night_waking' 
    | 'gas_fussy' 
    | 'first_smile' 
    | 'developmental_milestone' 
    | 'parent_exhaustion'
    | 'overtired_meltdown'
    | 'peaceful_nap'
    | 'rolls_over'
    | 'sleep_regression'
    | 'solid_food_interest'
    | 'away_summary'
    | 'growth_spurt'
    | 'evening_fussiness'
    | 'illness_start'
    | 'illness_end'
    | 'vaccination'
    | 'sync';
  source?: RecordSource;
  /** What the simulation looked like when this happened — the only thing an explanation may refer to. */
  snapshot?: EventSnapshot;
  title: string;
  description: string;
  educationalNote: string;
  severity: 'info' | 'warning' | 'urgent';
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: RecordSource;
}

export interface Milestone {
  id: string;
  title: string;
  category: 'motor' | 'social' | 'cognitive' | 'sleep_growth';
  minAgeDays: number;
  description: string;
  educationalInsight: string;
  unlocked: boolean;
  unlockedAtTimestamp?: number;
}

/** Truthful per-simulated-day counters, accumulated by the engine. Feeds journal stats and the final report. */
export interface DayLog {
  dayNumber: number;
  feeds: number;
  diaperChanges: number;
  sleepMinutes: number;
  cryingMinutes: number;
  nightWakings: number;
  autopilotActions: number;
  userActions: number;
  parentStressSum: number; // for averaging
  parentStressSamples: number;
}

export interface JournalEntry {
  id: string;
  dayNumber: number;
  simDateString: string;
  title: string;
  summary: string;
  reflection: string;
  educationalInsight: string;
  parentNotes?: string;
  stats: {
    feedsCount: number;
    diapersCount: number;
    sleepHoursTotal: number;
    cryingMinutesTotal: number;
    avgParentStress: number;
    /** true when derived from actual DayLog counters (never invented) */
    derivedFromLog: boolean;
  };
  milestonesEarned: string[];
}

export interface ScoreReport {
  babyWellbeingScore: number; // 0 to 100
  parentWellbeingScore: number; // 0 to 100
  parentingConfidenceScore: number; // 0 to 100
  relationshipScore: number; // 0 to 100 (if two parents)
  overallCareScore: number; // 0 to 100
  responsivenessRatePercent: number;
  totalInteractions: number;
  nighttimeWakingsHandled: number;
}

export type AppScreen = 
  | 'welcome'
  | 'onboarding'
  | 'parent_profile'
  | 'difficulty_select'
  | 'create_baby'
  | 'dashboard'
  | 'needs_status'
  | 'parent_status'
  | 'event_history'
  | 'journal'
  | 'settings';
