/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HouseholdType = 'single' | 'two_parent';

export type UserMotivation = 'planning_children' | 'newly_married' | 'curious_adult' | 'future_prep';

export type TemperamentType = 'easygoing' | 'sensitive' | 'intense' | 'active' | 'cautious';

export type DifficultyMode = 'realistic' | 'hardcore';

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

export type HealthCondition = 'healthy' | 'mild_gas' | 'overstimulated' | 'teething' | 'mild_fever';

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
  | 'check_health' 
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

export interface Baby {
  id: string;
  name: string;
  sex: 'girl' | 'boy' | 'surprise';
  birthWeightLbs: number;
  birthWeightOz: number;
  birthLengthInches: number;
  temperament: TemperamentType;
  currentWeightLbs: number;
  currentLengthInches: number;
  birthTimestamp: number; // Simulation start timestamp
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
  temperatureFahrenheit: number;
  healthState: HealthCondition;
  mood: BabyMood;

  // Caregiver memory / effectiveness (keyed by parentId)
  caregiverEffectiveness?: Record<string, CaregiverEffectivenessStats>;
  
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
}

export interface CareActionRecord {
  id: string;
  actionType: ActionCategory;
  timestamp: number;
  performedByParentId: string;
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
    | 'solid_food_interest';
  title: string;
  description: string;
  educationalNote: string;
  severity: 'info' | 'warning' | 'urgent';
  resolved: boolean;
  resolvedAt?: number;
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
