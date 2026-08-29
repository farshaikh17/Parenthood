/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Baby, 
  BabyState, 
  BabyMood, 
  CareActionRecord, 
  CaregiverEffectivenessStats,
  DevelopmentalStage,
  EventSnapshot,
  HealthCondition,
  DifficultyMode, 
  Milestone, 
  Parent, 
  ScoreReport, 
  SimulationEvent, 
  SimulationSettings, 
  UserProfile 
} from '../types';
import { EVENT_NOTES, MILESTONE_NOTES } from '../content/copy';
import { formatVolume } from '../utils/units';
import { advanceDevelopmentalAge, DEFAULT_COMPRESSION_SCHEDULE, getDevelopmentalAgeDays } from './clock';
import { describeBaby, driftAfterSleepAction, ensurePersonality, preferredCaregiver } from './personality';

/** Stable-enough IDs based on simulation time (not wall clock) plus a short random suffix. */
export function makeId(prefix: string, simTime: number): string {
  return `${prefix}_${Math.floor(simTime)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function snapshotOf(state: BabyState, simTime: number, isNight: boolean, ageDays: number): EventSnapshot {
  return {
    hunger: Math.round(state.hunger),
    sleepiness: Math.round(state.sleepiness),
    gasDiscomfort: Math.round(state.gasDiscomfort),
    diaperSoiled: Math.round(state.diaperSoiled),
    diaperType: state.diaperType,
    comfort: Math.round(state.comfort),
    awakeMinutes: Math.round(state.awakeMinutesElapsed),
    sleepMinutes: Math.round(state.sleepMinutesElapsed),
    isSleeping: state.isSleeping,
    isNight,
    minutesSinceFeed: Math.max(0, Math.round((simTime - state.lastFedTimestamp) / 60000)),
    minutesSinceDiaper: Math.max(0, Math.round((simTime - state.lastDiaperTimestamp) / 60000)),
    developmentalAgeDays: ageDays
  };
}

export function isNighttimeHour(hour: number, settings: SimulationSettings): boolean {
  const start = settings.nighttimeQuietStartHour ?? 22;
  const end = settings.nighttimeQuietEndHour ?? 7;
  return start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
}

export function getDevelopmentalStage(ageDays: number): DevelopmentalStage {
  if (ageDays < 56) return 'newborn'; // 0-8 weeks (0 to 55 days)
  if (ageDays < 119) return 'social_infant'; // 8-17 weeks (56 to 118 days)
  return 'infant_4_6mo'; // 17-26 weeks (119+ days)
}

/**
 * STAGE TUNING (simulation heuristics, informed by general guidance — see content/copy.ts sources)
 * - Newborns typically feed 8–12+ times in 24 h (NHS): hunger climbs 0→100 in ~2.5 h so a feed is wanted every 2–3 h.
 * - Newborn sleep totals vary widely (NHS: ~8–18 h/day) in short bursts; wake windows are short.
 * - By 3–6 months some babies sleep longer stretches at night (NHS: "8 hours or longer" for some).
 * - Solids: WHO recommends around 6 months, not before.
 * These numbers shape the FEEL of the simulation; they are not medical thresholds.
 */
export const STAGE_TUNING: Record<DevelopmentalStage, {
  hungerFullToStarvingMinutes: number; // time for hunger to go 0 → 100 while awake, average temperament
  nightHungerFactor: number;           // hunger climbs slower during night sleep
  wakeWindowMinutes: number;           // comfortable awake stretch; sleepiness reaches 100 at ~1.6× this
  sleepCycleMinutes: number;           // typical nap/sleep cycle length
  nightStretchMinutes: number;         // longest night stretch before natural waking (if not hungry)
  hungerWakeDay: number; hungerWakeNight: number; // sleeping baby wakes when hunger passes these
}> = {
  newborn:       { hungerFullToStarvingMinutes: 150, nightHungerFactor: 0.9, wakeWindowMinutes: 70,  sleepCycleMinutes: 50, nightStretchMinutes: 180, hungerWakeDay: 75, hungerWakeNight: 70 },
  social_infant: { hungerFullToStarvingMinutes: 190, nightHungerFactor: 0.7, wakeWindowMinutes: 100, sleepCycleMinutes: 60, nightStretchMinutes: 300, hungerWakeDay: 80, hungerWakeNight: 85 },
  infant_4_6mo:  { hungerFullToStarvingMinutes: 230, nightHungerFactor: 0.55, wakeWindowMinutes: 135, sleepCycleMinutes: 60, nightStretchMinutes: 480, hungerWakeDay: 80, hungerWakeNight: 90 }
};

export const SOLIDS_MIN_AGE_DAYS = 180; // "around 6 months" (WHO)

/**
 * DIFFICULT PERIODS & MINIMAL HEALTH (simulation heuristics; see content/copy.ts for what is sourced)
 * - Crying peak: harder between ~2 and ~12 weeks, worst around 6 weeks, evenings worst (NHS soothing guidance).
 * - Growth spurts: short hungrier spells at a few early ages (cluster feeding).
 * - Health: only mild, self-limiting episodes with observable cues. No vital signs. Ever.
 * - Vaccination: a generic early-months appointment; a day of being more unsettled afterwards.
 */
export const DIFFICULT_PERIODS = {
  cryingPeak: { startDay: 14, peakDay: 42, endDay: 84, maxPenaltyMultiplier: 1.25 },
  eveningHours: { start: 17, end: 22 },
  growthSpurtAges: [10, 21, 42, 90],
  growthSpurtDurationDays: 2,
  growthSpurtHungerMultiplier: 1.35,
  illness: { minAgeDays: 14, dailyChance: 0.03, maxEpisodes: 2, minDays: 2, maxDays: 4 },
  vaccinationAges: [56, 84, 112],
  postVaccineHours: 24
};

/** 1.0 outside the crying-peak window; rises to maxPenaltyMultiplier around the peak; extra in the evening. */
export function cryingPeakMultiplier(ageDays: number, hour: number): number {
  const c = DIFFICULT_PERIODS.cryingPeak;
  let m = 1.0;
  if (ageDays >= c.startDay && ageDays <= c.endDay) {
    const dist = Math.abs(ageDays - c.peakDay) / (c.peakDay - c.startDay);
    m = 1 + (c.maxPenaltyMultiplier - 1) * Math.max(0, 1 - dist);
  }
  if (hour >= DIFFICULT_PERIODS.eveningHours.start && hour < DIFFICULT_PERIODS.eveningHours.end && ageDays >= c.startDay && ageDays <= c.endDay) m += 0.1;
  return m;
}

export class SimulationEngine {
  /**
   * Helper to derive the developmental stage from baby's age in days.
   */
  static getDevelopmentalStage(ageDays: number): DevelopmentalStage {
    return getDevelopmentalStage(ageDays);
  }

  /**
   * Advances the simulation state by a given delta of simulated milliseconds.
   */
  static tick(
    baby: Baby,
    state: BabyState,
    parents: Parent[],
    activeParentId: string,
    settings: SimulationSettings,
    deltaSimulatedMs: number,
    existingEvents: SimulationEvent[],
    milestones: Milestone[]
  ): {
    nextBaby: Baby;
    nextState: BabyState;
    nextParents: Parent[];
    newEvents: SimulationEvent[];
    updatedMilestones: Milestone[];
  } {
    const personality = ensurePersonality(baby);
    const tempConfig = {
      soothabilityMultiplier: personality.soothability,
      hungerToleranceMultiplier: personality.hungerTolerance,
      sleepCycleDurationMinutes: 50 * personality.sleepCycleFactor
    };
    const diffMultiplier = settings.difficulty === 'hardcore' ? 1.35 : 1.0;
    
    // Delta in simulated minutes
    const deltaMinutes = deltaSimulatedMs / (60 * 1000);
    if (deltaMinutes <= 0) {
      return { nextBaby: baby, nextState: state, nextParents: parents, newEvents: [], updatedMilestones: milestones };
    }

    const nextState: BabyState = { ...state };
    const nextBaby: Baby = { ...baby, personality };
    let nextParents = parents.map(p => ({ ...p }));
    const newEvents: SimulationEvent[] = [];
    const updatedMilestones = milestones.map(m => ({ ...m }));

    const simTime = settings.simulatedTimeMs + deltaSimulatedMs;
    const simDate = new Date(simTime);
    const currentHour = simDate.getHours();
    const isNighttime = isNighttimeHour(currentHour, settings);

    // 1. Developmental age (compressed clock), stage & growth
    nextBaby.developmentalAgeDays = advanceDevelopmentalAge(
      baby.developmentalAgeDays ?? 0,
      deltaSimulatedMs,
      settings.compressionSchedule || DEFAULT_COMPRESSION_SCHEDULE
    );
    const ageDays = getDevelopmentalAgeDays(nextBaby);
    const stage = SimulationEngine.getDevelopmentalStage(ageDays);
    const tune = STAGE_TUNING[stage];
    
    // Growth is a smooth simulation heuristic (roughly 25 g/day in the first ~3 months, ~17 g/day after; ~0.09 cm/day).
    // Not a growth chart. Real growth is assessed by health professionals.
    // Uses developmental age so growth follows the compressed journey (~+4.5 kg and ~+16 cm by 6 months, near WHO medians).
    const devAge = nextBaby.developmentalAgeDays;
    const gainedGrams = devAge < 90 ? devAge * 30 : (90 * 30) + ((devAge - 90) * 18);
    nextBaby.currentWeightGrams = Math.round(baby.birthWeightGrams + gainedGrams);
    nextBaby.currentLengthCm = parseFloat((baby.birthLengthCm + (devAge * 0.088)).toFixed(1));

    // Bounded 4-month sleep regression window (days 120 to 134, lasting 2 weeks)
    const isSleepRegression = stage === 'infant_4_6mo' && ageDays >= 120 && ageDays <= 134;

    // 2. Hunger Progression (Milk & Complementary Solids)
    // Milk hunger progression: stage × temperament × difficulty, slower during night sleep
    const nightSleepFactor = (isNighttime && nextState.isSleeping) ? tune.nightHungerFactor : 1;
    const inGrowthSpurt = (nextState.growthSpurtUntil || 0) > simTime;
    const spurtFactor = inGrowthSpurt ? DIFFICULT_PERIODS.growthSpurtHungerMultiplier * (settings.difficulty === 'hardcore' ? 1.15 : 1) : 1;
    const hungerRatePerMinute = (100 / (tune.hungerFullToStarvingMinutes * tempConfig.hungerToleranceMultiplier)) * diffMultiplier * nightSleepFactor * spurtFactor;
    nextState.hunger = Math.min(100, Math.max(0, nextState.hunger + (hungerRatePerMinute * deltaMinutes)));

    // Interest in solids only around 6 months (WHO), alongside milk
    if (ageDays >= SOLIDS_MIN_AGE_DAYS) {
      nextState.solidFoodHunger = nextState.solidFoodHunger ?? 0;
      const solidFoodRatePerMinute = (100 / 360) * diffMultiplier; // ~6 hours
      nextState.solidFoodHunger = Math.min(100, Math.max(0, nextState.solidFoodHunger + (solidFoodRatePerMinute * deltaMinutes)));
    } else {
      nextState.solidFoodHunger = 0;
    }

    // 3. Sleep & Wake Cycles
    if (nextState.isSleeping) {
      nextState.sleepMinutesElapsed += deltaMinutes;
      nextState.awakeMinutesElapsed = 0;

      // Restorative sleep: a full recovery takes about two sleep cycles
      const sleepRecoveryRate = 100 / (tune.sleepCycleMinutes * 2);
      nextState.sleepiness = Math.max(0, nextState.sleepiness - (sleepRecoveryRate * deltaMinutes));

      const snifflyNow = nextState.healthState === 'sniffles' && (nextState.healthUntil || 0) > simTime;
      const cycleMinutes = tune.sleepCycleMinutes * (tempConfig.sleepCycleDurationMinutes / 50) * (snifflyNow ? 0.75 : 1); // temperament scales cycle length; a blocked nose fragments sleep
      const hungerWakeThreshold = isNighttime ? tune.hungerWakeNight : tune.hungerWakeDay;
      const diaperWakeThreshold = isNighttime ? 75 : 70;
      const gasWakeThreshold = isNighttime ? 65 : 60;

      // Natural waking: at the end of a cycle, if rested enough, the baby may wake (chance grows with restedness).
      // At night, longer consolidated stretches are possible for older babies.
      const atCycleBoundary = Math.floor(nextState.sleepMinutesElapsed / cycleMinutes) > Math.floor((nextState.sleepMinutesElapsed - deltaMinutes) / cycleMinutes);
      const maxStretch = isNighttime ? tune.nightStretchMinutes : tune.sleepCycleMinutes * 3;
      const restedness = Math.max(0, (40 - nextState.sleepiness) / 40); // 0 when sleepiness ≥ 40, 1 when fully rested
      const regressionPenalty = isSleepRegression ? 0.35 : 0;
      // Daytime naps end readily once rested; at night, babies mostly link cycles until hungry or the stretch is used up
      const nightBase = (stage === 'newborn' ? 0.08 : stage === 'social_infant' ? 0.05 : 0.03) + personality.sensitivity * 0.04;
      const wakeChance = isNighttime ? (nightBase + restedness * 0.12 + regressionPenalty) : (0.25 + restedness * 0.6 + regressionPenalty);
      const naturalWake = atCycleBoundary && (Math.random() < wakeChance || nextState.sleepMinutesElapsed >= maxStretch);

      const distressWake = nextState.hunger > hungerWakeThreshold ||
                           nextState.diaperSoiled > diaperWakeThreshold ||
                           nextState.gasDiscomfort > gasWakeThreshold;

      if (naturalWake || distressWake) {
        nextState.isSleeping = false;
        nextState.sleepMinutesElapsed = 0;
        nextState.awakeMinutesElapsed = 1;

        if (isNighttime && settings.nighttimeAlertsEnabled !== false) {
          const hasRecentUnresolved = existingEvents.some(
            e => (e.type === 'night_waking' || e.type === 'sleep_regression') && !e.resolved && (simTime - e.timestamp) < 30 * 60 * 1000
          );

          if (!hasRecentUnresolved) {
            newEvents.push({
              id: makeId('night_wake', simTime),
              timestamp: simTime,
              dayNumber: ageDays,
              type: isSleepRegression ? 'sleep_regression' : 'night_waking',
              source: 'system',
              snapshot: snapshotOf(nextState, simTime, isNighttime, ageDays),
              title: isSleepRegression ? 'A rough night' : 'Night waking',
              description: isSleepRegression
                ? `${baby.name} woke between sleep cycles during a rough patch of sleep.`
                : `${baby.name} woke up at night (${new Date(simTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) and needs you.`,
              educationalNote: isSleepRegression ? EVENT_NOTES.sleep_regression.body : EVENT_NOTES.night_waking.body,
              severity: 'warning',
              resolved: false
            });
          }
        }
      }
    } else {
      nextState.awakeMinutesElapsed += deltaMinutes;
      nextState.sleepMinutesElapsed = 0;

      // At night a comfortable, fed baby may drift back to sleep on their own (more likely as they get older)
      if (isNighttime && nextState.comfort > 70 && nextState.hunger < 50 && nextState.awakeMinutesElapsed > 10) {
        const selfSettlePerMinute = stage === 'newborn' ? 0.015 : stage === 'social_infant' ? 0.025 : 0.035;
        if (Math.random() < selfSettlePerMinute * deltaMinutes) {
          nextState.isSleeping = true;
          nextState.sleepMinutesElapsed = 0;
        }
      }

      // Sleepiness reaches 100 at ~1.6× the comfortable wake window (over-tired territory beyond the window)
      const regressionFatigueMultiplier = isSleepRegression ? 1.2 : 1.0;
      const fatigueRate = (100 / (tune.wakeWindowMinutes * 1.6)) * (settings.difficulty === 'hardcore' ? 1.15 : 1.0) * regressionFatigueMultiplier;
      nextState.sleepiness = Math.min(100, Math.max(0, nextState.sleepiness + (fatigueRate * deltaMinutes)));

      // Chance-based 'Rolls Over' event for 4-6 Month Stage
      if (stage === 'infant_4_6mo' && nextState.awakeMinutesElapsed > 5 && nextState.comfort > 60) {
        const rollChance = 0.008 * deltaMinutes;
        if (Math.random() < rollChance && existingEvents.filter(e => e.type === 'rolls_over' && (simTime - e.timestamp) < 24 * 60 * 60 * 1000).length === 0) {
          newEvents.push({
            id: makeId('roll', simTime),
            timestamp: simTime,
            dayNumber: ageDays,
            type: 'rolls_over',
            source: 'system',
            snapshot: snapshotOf(nextState, simTime, isNighttime, ageDays),
            title: `${baby.name} rolled over`,
            description: `${baby.name} rolled over on the play mat for the first time.`,
            educationalNote: EVENT_NOTES.rolls_over.body,
            severity: 'info',
            resolved: true,
            resolvedAt: simTime
          });

          const rollMilestoneIdx = updatedMilestones.findIndex(m => m.id === 'rolls_over');
          if (rollMilestoneIdx !== -1 && !updatedMilestones[rollMilestoneIdx].unlocked) {
            updatedMilestones[rollMilestoneIdx] = { ...updatedMilestones[rollMilestoneIdx], unlocked: true, unlockedAtTimestamp: simTime };
          }
        }
      }
    }

    // 4. Diaper Soiling (Random chance based on elapsed time)
    const minutesSinceDiaper = (simTime - nextState.lastDiaperTimestamp) / (60 * 1000);
    if (minutesSinceDiaper > 120 && Math.random() < (0.015 * deltaMinutes)) {
      if (nextState.diaperType === 'clean') {
        const isDirty = Math.random() < 0.4;
        nextState.diaperType = isDirty ? 'dirty' : 'wet';
        nextState.diaperSoiled = isDirty ? 85 : 55;

        if (isDirty && settings.difficulty === 'hardcore' && Math.random() < 0.25) {
          newEvents.push({
            id: makeId('blowout', simTime),
            timestamp: simTime,
            dayNumber: ageDays,
            type: 'diaper_blowout',
            source: 'system',
            snapshot: snapshotOf(nextState, simTime, isNighttime, ageDays),
            title: 'Nappy leak and clothes change',
            description: `${baby.name}'s nappy leaked. A full change of clothes is needed.`,
            educationalNote: EVENT_NOTES.diaper_blowout.body,
            severity: 'warning',
            resolved: false
          });
        }
      } else {
        nextState.diaperSoiled = Math.min(100, nextState.diaperSoiled + (0.2 * deltaMinutes));
      }
    }

    // 5. Gas Discomfort & Colic
    const minutesSinceFeeding = (simTime - nextState.lastFedTimestamp) / (60 * 1000);
    const minutesSinceBurp = (simTime - nextState.lastBurpedTimestamp) / (60 * 1000);
    const tummy = nextState.healthState === 'unsettled_tummy' && (nextState.healthUntil || 0) > simTime;
    if (minutesSinceFeeding < 60 && minutesSinceBurp > 45) {
      nextState.gasDiscomfort = Math.min(100, nextState.gasDiscomfort + ((tummy ? 0.6 : 0.35) * deltaMinutes));
    } else if (tummy && Math.random() < 0.02 * deltaMinutes) {
      nextState.gasDiscomfort = Math.min(100, nextState.gasDiscomfort + 8);
    } else {
      nextState.gasDiscomfort = Math.max(0, nextState.gasDiscomfort - (0.15 * deltaMinutes));
    }

    // 6. Comfort Calculation
    // Comfort: a content baby tolerates mild hunger/tiredness; distress ramps once needs are clearly unmet
    const hungerPenalty = Math.max(0, (nextState.hunger - 55) * 1.6);
    const solidFoodPenalty = (ageDays >= SOLIDS_MIN_AGE_DAYS && (nextState.solidFoodHunger || 0) > 60) ? ((nextState.solidFoodHunger || 0) - 60) * 0.3 : 0;
    const diaperPenalty = Math.max(0, (nextState.diaperSoiled - 45) * 0.9);
    const gasPenalty = Math.max(0, (nextState.gasDiscomfort - 20) * 0.8);
    const overtiredPenalty = nextState.sleepiness > 70 && !nextState.isSleeping ? (nextState.sleepiness - 70) * 1.8 : 0;
    
    const sniffly = nextState.healthState === 'sniffles' && (nextState.healthUntil || 0) > simTime;
    const postVaccine = (nextState.postVaccineUntil || 0) > simTime;
    const peak = cryingPeakMultiplier(ageDays, currentHour);
    const episodePenalty = (sniffly ? 8 : 0) + (postVaccine ? 8 : 0);
    const totalDistress = (hungerPenalty + solidFoodPenalty + diaperPenalty + gasPenalty + overtiredPenalty) * peak + episodePenalty;
    nextState.comfort = Math.max(0, Math.min(100, 100 - totalDistress));

    // 7. Mood is derived from comfort (and, when content, from tiredness/hunger). Never randomised.
    let calculatedMood: BabyMood = 'quiet_alert';

    if (nextState.isSleeping) {
      calculatedMood = nextState.comfort > 60 ? 'sleeping_deep' : 'sleeping_light';
      nextState.cryingMinutesContinuous = 0;
    } else if (nextState.comfort > 70) {
      const playThreshold = stage !== 'newborn' ? 65 : 75;
      if (nextState.sleepiness > 65) calculatedMood = 'drowsy';
      else if (nextState.comfort > playThreshold && nextState.hunger < 50 && nextState.sleepiness < 55 && (nextState.awakeMinutesElapsed > 10 || stage !== 'newborn')) calculatedMood = 'playful';
      else calculatedMood = 'quiet_alert';
      nextState.cryingMinutesContinuous = 0;
    } else if (nextState.comfort > 45) {
      calculatedMood = 'fussy';
      nextState.cryingMinutesContinuous += deltaMinutes * 0.5; // grizzling, not full crying
    } else if (nextState.comfort > 20) {
      calculatedMood = 'active_crying';
      nextState.cryingMinutesContinuous += deltaMinutes;
    } else {
      calculatedMood = 'inconsolable';
      nextState.cryingMinutesContinuous += deltaMinutes;
    }
    nextState.mood = calculatedMood;

    // Trigger crying spell event if crying persists > 5 minutes
    if (nextState.cryingMinutesContinuous > 5 && existingEvents.filter(e => !e.resolved && e.type === 'crying_spell').length === 0) {
      newEvents.push({
        id: makeId('cry', simTime),
        timestamp: simTime,
        dayNumber: ageDays,
        type: 'crying_spell',
        source: 'system',
        snapshot: snapshotOf(nextState, simTime, isNighttime, ageDays),
        title: `${baby.name} is crying`,
        description: `${baby.name} has been crying for a while. ${nextState.mood === 'inconsolable' ? 'It is getting harder to settle them.' : 'Something needs attention.'}`,
        educationalNote: EVENT_NOTES.crying_spell.body,
        severity: nextState.mood === 'inconsolable' ? 'urgent' : 'warning',
        resolved: false
      });
    }

    // 8. Parent Physiological & Mental State Evolution
    nextParents = nextParents.map(p => {
      const isCurrentActive = p.id === activeParentId;
      let stressDelta = 0;
      let energyDelta = 0;
      let sleepDebtDelta = 0;

      // Active crying increases parent stress
      if (nextState.mood === 'active_crying' || nextState.mood === 'inconsolable') {
        stressDelta += (0.4 * deltaMinutes);
      } else if (nextState.isSleeping) {
        // Calm reduces stress
        stressDelta -= (0.2 * deltaMinutes);
      }

      // Energy consumption during active caregiving
      if (isCurrentActive) {
        energyDelta -= (0.15 * deltaMinutes);
        if (isNighttime && !nextState.isSleeping) {
          sleepDebtDelta += (deltaMinutes / 60);
          stressDelta += (0.3 * deltaMinutes);
        }
      } else {
        // Non-active partner recovers some energy
        energyDelta += (0.25 * deltaMinutes);
      }

      return {
        ...p,
        stressLevel: Math.max(0, Math.min(100, p.stressLevel + stressDelta)),
        energy: Math.max(0, Math.min(100, p.energy + energyDelta)),
        sleepDebtHours: parseFloat(Math.min(24, Math.max(0, p.sleepDebtHours + sleepDebtDelta)).toFixed(1))
      };
    });

    // 8b. Difficult periods & minimal health (bounded, state-aware, honest)
    const careDay = Math.max(0, Math.floor((simTime - baby.birthTimestamp) / 86400000));
    const chanceScale = deltaMinutes / (24 * 60); // per-day probabilities applied per tick

    // Growth spurts at a few early ages (once each)
    const spurtAge = DIFFICULT_PERIODS.growthSpurtAges.find(a => ageDays >= a && ageDays < a + 1 && (nextState.lastGrowthSpurtAgeDays ?? -1) < a);
    if (spurtAge !== undefined) {
      nextState.lastGrowthSpurtAgeDays = spurtAge;
      nextState.growthSpurtUntil = simTime + DIFFICULT_PERIODS.growthSpurtDurationDays * 86400000;
      newEvents.push({
        id: makeId('spurt', simTime), timestamp: simTime, dayNumber: ageDays, type: 'growth_spurt', source: 'system',
        snapshot: snapshotOf(nextState, simTime, isNighttime, ageDays),
        title: 'A hungrier couple of days', description: `${baby.name} seems to want feeding all the time. This usually passes in a day or two.`,
        educationalNote: EVENT_NOTES.growth_spurt.body, severity: 'info', resolved: true, resolvedAt: simTime
      });
    }

    // Evening fussiness during the crying-peak window (at most once per care day, only when awake and not content)
    const inPeak = ageDays >= DIFFICULT_PERIODS.cryingPeak.startDay && ageDays <= DIFFICULT_PERIODS.cryingPeak.endDay;
    const isEvening = currentHour >= DIFFICULT_PERIODS.eveningHours.start && currentHour < DIFFICULT_PERIODS.eveningHours.end;
    if (inPeak && isEvening && !nextState.isSleeping && nextState.comfort < 60 && (nextState.lastEveningFussDay ?? -1) !== careDay && Math.random() < 0.06 * deltaMinutes) {
      nextState.lastEveningFussDay = careDay;
      nextState.comfort = Math.max(0, nextState.comfort - 15);
      newEvents.push({
        id: makeId('evening', simTime), timestamp: simTime, dayNumber: ageDays, type: 'evening_fussiness', source: 'system',
        snapshot: snapshotOf(nextState, simTime, isNighttime, ageDays),
        title: 'The evening stretch', description: `${baby.name} is hard to settle this evening and nothing seems to work for long.`,
        educationalNote: EVENT_NOTES.evening_fussiness.body, severity: 'warning', resolved: false
      });
    }

    // Mild illness episodes: rare, bounded, self-limiting
    const ill = DIFFICULT_PERIODS.illness;
    if (nextState.healthState !== 'healthy' && (nextState.healthUntil || 0) <= simTime) {
      const was = nextState.healthState;
      nextState.healthState = 'healthy';
      nextState.healthUntil = undefined;
      newEvents.push({
        id: makeId('well', simTime), timestamp: simTime, dayNumber: ageDays, type: 'illness_end', source: 'system',
        title: was === 'sniffles' ? 'Nose is clear again' : 'Tummy settled', description: `${baby.name} seems back to normal.`,
        educationalNote: EVENT_NOTES.illness_end.body, severity: 'info', resolved: true, resolvedAt: simTime
      });
    } else if (nextState.healthState === 'healthy' && ageDays >= ill.minAgeDays && (nextState.illnessEpisodes || 0) < ill.maxEpisodes) {
      const chance = ill.dailyChance * (settings.difficulty === 'hardcore' ? 1.8 : 1) * chanceScale;
      if (Math.random() < chance) {
        const kind: HealthCondition = Math.random() < 0.6 ? 'sniffles' : 'unsettled_tummy';
        const days = ill.minDays + Math.random() * (ill.maxDays - ill.minDays);
        nextState.healthState = kind;
        nextState.healthUntil = simTime + days * 86400000;
        nextState.illnessEpisodes = (nextState.illnessEpisodes || 0) + 1;
        newEvents.push({
          id: makeId('ill', simTime), timestamp: simTime, dayNumber: ageDays, type: 'illness_start', source: 'system',
          snapshot: snapshotOf(nextState, simTime, isNighttime, ageDays),
          title: kind === 'sniffles' ? 'A snuffly nose' : 'An unsettled tummy',
          description: kind === 'sniffles'
            ? `${baby.name} is snuffly and blocked up — feeds are short and broken, and sleep is lighter. This should pass in a few days.`
            : `${baby.name} is windy and uncomfortable today, pulling their legs up and grizzling after feeds.`,
          educationalNote: EVENT_NOTES.illness_start.body, severity: 'warning', resolved: false
        });
      }
    }

    // Routine vaccination appointments at a few early ages (generic, no schedule claims)
    const vacAge = DIFFICULT_PERIODS.vaccinationAges.find(a => ageDays >= a && ageDays < a + 1 && (nextState.lastVaccinationAgeDays ?? -1) < a);
    if (vacAge !== undefined && !isNighttime) {
      nextState.lastVaccinationAgeDays = vacAge;
      nextState.postVaccineUntil = simTime + DIFFICULT_PERIODS.postVaccineHours * 3600000;
      newEvents.push({
        id: makeId('vac', simTime), timestamp: simTime, dayNumber: ageDays, type: 'vaccination', source: 'system',
        snapshot: snapshotOf(nextState, simTime, isNighttime, ageDays),
        title: 'Routine vaccination appointment', description: `${baby.name} had a routine vaccination today and may be more unsettled than usual for a day.`,
        educationalNote: EVENT_NOTES.vaccination.body, severity: 'info', resolved: true, resolvedAt: simTime
      });
    }

    // 9. Developmental Milestones Check (Reusing existing unlock mechanism)
    for (let i = 0; i < updatedMilestones.length; i++) {
      const m = updatedMilestones[i];
      if (!m.unlocked && ageDays >= m.minAgeDays) {
        // Age gate comes from initialData (aligned with published "most babies by N months" windows);
        // some milestones also need the right moment (a content, awake baby; a real long sleep; an actual first taste).
        let conditionMet = true;
        if (m.id === 'first_social_smile' && !(nextState.comfort > 70 && !nextState.isSleeping)) conditionMet = false;
        if (m.id === 'cooing_sounds' && !(nextState.mood === 'playful' || nextState.mood === 'quiet_alert')) conditionMet = false;
        if (m.id === 'tummy_head_lift' && (simTime - nextState.lastTummyTimeTimestamp) > 3 * 24 * 60 * 60 * 1000 && ageDays < 56) conditionMet = false;
        if (m.id === 'longer_night_stretch' && nextState.sleepMinutesElapsed < 240) conditionMet = false;
        if (m.id === 'rolls_over' && !(nextState.awakeMinutesElapsed > 10 || ageDays >= 150)) conditionMet = false;
        if (m.id === 'first_solid_food' && nextState.lastSolidsTimestamp === undefined) conditionMet = false;

        if (conditionMet) {
          updatedMilestones[i] = {
            ...m,
            unlocked: true,
            unlockedAtTimestamp: simTime
          };

          newEvents.push({
            id: makeId(`milestone_${m.id}`, simTime),
            timestamp: simTime,
            dayNumber: ageDays,
            type: 'developmental_milestone',
            source: 'system',
            snapshot: snapshotOf(nextState, simTime, isNighttime, ageDays),
            title: `Milestone: ${m.title}`,
            description: `${baby.name}: ${m.description}`,
            educationalNote: MILESTONE_NOTES[m.id] || EVENT_NOTES.developmental_milestone.body,
            severity: 'info',
            resolved: true,
            resolvedAt: simTime
          });
        }
      }
    }

    return {
      nextBaby,
      nextState,
      nextParents,
      newEvents,
      updatedMilestones
    };
  }

  /**
   * Applies a specific caregiving action to the baby and parent states.
   */
  static applyAction(
    actionType: string,
    baby: Baby,
    state: BabyState,
    parents: Parent[],
    activeParentId: string,
    settings: SimulationSettings,
    actionParams: any = {},
    options: { source?: 'user' | 'autopilot' } = {}
  ): {
    nextState: BabyState;
    nextParents: Parent[];
    nextBaby: Baby;
    record: CareActionRecord;
    feedbackMessage: string;
    resolvedEventIds?: string[];
  } {
    const source = options.source || 'user';
    const isAutopilot = source === 'autopilot';
    const nextState = { ...state };
    let nextParents = parents.map(p => ({ ...p }));
    const simTime = settings.simulatedTimeMs;
    let personality = ensurePersonality(baby);
    const tempConfig = { soothabilityMultiplier: personality.soothability };
    const ageDays = getDevelopmentalAgeDays(baby);
    const stage = SimulationEngine.getDevelopmentalStage(ageDays);

    let effectiveness: 'excellent' | 'moderate' | 'ineffective' = 'moderate';
    let feedback = '';
    const deltaSummary: any = {};

    const isSoothingAction = ['cuddle', 'rock', 'feed', 'feed_solids', 'put_to_sleep', 'burp', 'change_diaper', 'bathe'].includes(actionType);

    // Retrieve previous caregiver effectiveness stats to calculate bounded track-record bonus
    const prevCaregiverStats = state.caregiverEffectiveness?.[activeParentId];
    const currentAffinity = prevCaregiverStats ? prevCaregiverStats.affinityScore : 50;

    let caregiverComfortBonus = 0;
    let caregiverConfidenceBonus = 0;

    // A baby who has come to settle best with one caregiver is a little harder for the other to settle when very upset
    const pref = isAutopilot ? null : preferredCaregiver(state, parents);
    const nonPreferredPenalty = pref && pref.parent.id !== activeParentId && state.comfort < 40 ? 0.85 : 1.0;

    if (isSoothingAction && currentAffinity > 50) {
      // Modest comfort bonus (+1 to +6)
      caregiverComfortBonus = Math.min(6, Math.max(1, Math.round((currentAffinity - 50) / 10)));
      // Modest confidence bonus (+1 to +3)
      caregiverConfidenceBonus = Math.min(3, Math.max(1, Math.round((currentAffinity - 50) / 20)));
    }

    switch (actionType) {
      case 'feed': {
        // Canonical volume is millilitres. ~30 ml reduces hunger by ~25 points.
        const feedAmountMl: number = actionParams.amountMl || (baby.currentWeightGrams > 4500 ? 120 : 75);
        const snifflyFeed = nextState.healthState === 'sniffles' && (nextState.healthUntil || 0) > simTime;
        const reduction = Math.min(nextState.hunger, (feedAmountMl / 30) * 25 * (snifflyFeed ? 0.7 : 1));
        nextState.hunger = Math.max(0, nextState.hunger - reduction);
        nextState.lastFedTimestamp = simTime;
        // Feeding introduces air/gas
        nextState.gasDiscomfort = Math.min(100, nextState.gasDiscomfort + 25);
        nextState.comfort = Math.min(100, nextState.comfort + 20);
        
        effectiveness = reduction > 30 ? 'excellent' : 'moderate';
        feedback = `${baby.name} took ${formatVolume(feedAmountMl, settings.unitSystem || 'imperial')}.${snifflyFeed ? ' Kept breaking off to breathe through the blocked nose.' : ''}${reduction >= 30 ? ' Hunger eased.' : ' Still seems hungry.'} A burp may be needed.`;
        
        deltaSummary.hunger = -reduction;
        deltaSummary.gas = +25;
        deltaSummary.comfort = +20;
        break;
      }

      case 'feed_solids': {
        if (ageDays < SOLIDS_MIN_AGE_DAYS) {
          feedback = `${baby.name} is not six months old yet. In this simulation solids are not offered before then.`;
          effectiveness = 'ineffective';
        } else {
          const reduction = Math.min(nextState.hunger, 35);
          nextState.hunger = Math.max(0, nextState.hunger - reduction);
          nextState.solidFoodHunger = 0;
          nextState.lastSolidsTimestamp = simTime;
          nextState.lastFedTimestamp = simTime;
          nextState.comfort = Math.min(100, nextState.comfort + 25);

          effectiveness = 'excellent';
          const foodName = actionParams.foodType || 'sweet potato puree';
          feedback = `Offered ${baby.name} small spoonfuls of ${foodName}. Most of it ended up on the bib, some went in.`;

          deltaSummary.hunger = -reduction;
          deltaSummary.comfort = +25;
        }
        break;
      }

      case 'burp': {
        const gasRelief = Math.min(nextState.gasDiscomfort, 45 * tempConfig.soothabilityMultiplier);
        nextState.gasDiscomfort = Math.max(0, nextState.gasDiscomfort - gasRelief);
        nextState.lastBurpedTimestamp = simTime;
        nextState.comfort = Math.min(100, nextState.comfort + 15);
        
        effectiveness = gasRelief > 10 ? 'excellent' : 'moderate';
        feedback = gasRelief > 10 ? `Patted ${baby.name}'s back. A burp came up.` : `Patted ${baby.name}'s back. Nothing much came up this time.`;
        
        deltaSummary.gas = -gasRelief;
        deltaSummary.comfort = +15;
        break;
      }

      case 'change_diaper': {
        nextState.diaperSoiled = 0;
        nextState.diaperType = 'clean';
        nextState.lastDiaperTimestamp = simTime;
        nextState.comfort = Math.min(100, nextState.comfort + 30);
        
        effectiveness = 'excellent';
        feedback = `Changed ${baby.name} into a clean nappy.`;
        
        deltaSummary.comfort = +30;
        break;
      }

      case 'rock':
      case 'cuddle': {
        const soothingBoost = Math.round(35 * tempConfig.soothabilityMultiplier * nonPreferredPenalty);
        nextState.comfort = Math.min(100, nextState.comfort + soothingBoost);
        nextState.lastSootherTimestamp = simTime;
        nextState.cryingMinutesContinuous = Math.max(0, nextState.cryingMinutesContinuous - 5);

        // If very sleepy and comfortable, might drift to sleep
        // Babies used to being held fall asleep in arms more readily
        const heldThreshold = 55 - (personality.heldToSleepHabit - 30) * 0.2;
        if (nextState.sleepiness > heldThreshold && nextState.hunger < 55 && nextState.gasDiscomfort < 40) {
          nextState.isSleeping = true;
          nextState.sleepMinutesElapsed = 0;
          nextState.mood = 'sleeping_light';
          personality = driftAfterSleepAction(personality, 'held_to_sleep');
          feedback = `${baby.name} relaxed against your chest and drifted off to sleep.`;
          effectiveness = 'excellent';
        } else {
          feedback = `Held ${baby.name} close. ${nextState.comfort > 60 ? 'They settled a little.' : 'They are still unsettled.'}`;
          effectiveness = 'moderate';
        }

        deltaSummary.comfort = +soothingBoost;
        break;
      }

      case 'put_to_sleep': {
        if (nextState.hunger > 60) {
          feedback = `${baby.name} won't settle in the cot. They root and fuss when put down.`;
          effectiveness = 'ineffective';
        } else if (nextState.gasDiscomfort > 55) {
          feedback = `${baby.name} squirms and pulls their legs up when put down. Something is uncomfortable.`;
          effectiveness = 'ineffective';
        } else if (nextState.sleepiness < 30) {
          feedback = `${baby.name} is wide awake and looks around. Not ready for sleep yet.`;
          effectiveness = 'ineffective';
        } else {
          // Settling in the cot is a learned thing: a baby usually held to sleep protests more; practice makes it easier
          const cotSkill = personality.settleInCotSkill - personality.heldToSleepHabit * 0.5;
          const refuseChance = Math.max(0.05, Math.min(0.6, 0.35 - cotSkill / 200 - (nextState.sleepiness - 50) / 200));
          if (Math.random() < refuseChance && !isAutopilot) {
            personality = driftAfterSleepAction(personality, 'put_to_sleep_fail');
            feedback = `Put ${baby.name} down — they startled awake and started fussing as soon as your hands left them.`;
            effectiveness = 'ineffective';
          } else {
            nextState.isSleeping = true;
            nextState.sleepMinutesElapsed = 0;
            nextState.comfort = Math.min(100, nextState.comfort + 10);
            personality = driftAfterSleepAction(personality, 'put_to_sleep_ok');
            feedback = `Put ${baby.name} down on their back in the cot. They drifted off.`;
            effectiveness = 'excellent';
            deltaSummary.sleepiness = 0;
          }
        }
        break;
      }

      case 'tummy_time': {
        if (nextState.isSleeping) {
          feedback = `Cannot do tummy time while baby is sleeping.`;
          effectiveness = 'ineffective';
        } else if (nextState.hunger > 50 || nextState.sleepiness > 70) {
          feedback = `${baby.name} is too fussy or tired for tummy time right now.`;
          effectiveness = 'ineffective';
        } else {
          nextState.lastTummyTimeTimestamp = simTime;
          nextState.gasDiscomfort = Math.max(0, nextState.gasDiscomfort - 20);
          nextState.sleepiness = Math.min(100, nextState.sleepiness + 15);
          feedback = `A short, supervised tummy-time session. ${baby.name} worked hard and got tired.`;
          effectiveness = 'excellent';
        }
        break;
      }

      case 'bathe': {
        nextState.comfort = Math.min(100, nextState.comfort + 25);
        nextState.sleepiness = Math.min(100, nextState.sleepiness + 20);
        feedback = `Gave ${baby.name} a warm bath. They are calmer and sleepier.`;
        effectiveness = 'excellent';
        break;
      }

      case 'observe': {
        // Observable cues only — derived from simulation state. No vital signs, no diagnosis.
        const cues: string[] = [];
        if (nextState.isSleeping) cues.push('sleeping' + (nextState.comfort < 50 ? ', stirring and twitching' : ' peacefully'));
        else {
          if (nextState.cryingMinutesContinuous > 5) cues.push(`crying for about ${Math.round(nextState.cryingMinutesContinuous)} minutes`);
          if (nextState.hunger > 60) cues.push('rooting and sucking on hands');
          if (nextState.gasDiscomfort > 45) cues.push('pulling legs up and squirming');
          if (nextState.sleepiness > 70) cues.push('rubbing eyes, yawning, staring blankly');
          if (nextState.diaperSoiled > 50) cues.push(`nappy feels ${nextState.diaperType === 'dirty' || nextState.diaperType === 'both' ? 'dirty' : 'wet'}`);
          if (nextState.healthState === 'sniffles' && (nextState.healthUntil || 0) > simTime) cues.push('snuffly, breathing through the mouth, a bit of a runny nose');
          if (nextState.healthState === 'unsettled_tummy' && (nextState.healthUntil || 0) > simTime) cues.push('tummy feels tight, lots of wriggling');
          if (cues.length === 0) cues.push('calm and alert, looking around');
        }
        feedback = `${describeBaby(baby, nextState, stage)} You watch ${baby.name} for a moment: ${cues.join('; ')}.`;
        effectiveness = 'moderate';
        break;
      }

      case 'parent_break': {
        nextParents = nextParents.map(p => {
          if (p.id === activeParentId) {
            return {
              ...p,
              stressLevel: Math.max(0, p.stressLevel - 30),
              energy: Math.min(100, p.energy + 25),
              confidence: Math.min(100, p.confidence + 5)
            };
          }
          return p;
        });
        feedback = `You stepped away for ten minutes. It helped a bit; the baby is still there when you come back.`;
        effectiveness = 'excellent';
        break;
      }

      default:
        feedback = `Action performed.`;
    }

    // Apply caregiver effectiveness comfort bonus if action succeeded and wasn't ineffective
    if (isSoothingAction && effectiveness !== 'ineffective' && caregiverComfortBonus > 0) {
      nextState.comfort = Math.min(100, nextState.comfort + caregiverComfortBonus);
      if (deltaSummary.comfort !== undefined) {
        deltaSummary.comfort += caregiverComfortBonus;
      }
    }

    // Deterministic Caregiver Memory & Effectiveness Update (never for autopilot care)
    if (isSoothingAction && !isAutopilot) {
      const isSuccess = effectiveness === 'excellent' || (effectiveness === 'moderate' && nextState.comfort >= state.comfort);
      const timeToSoothe = state.cryingMinutesContinuous > 0 
        ? Math.max(1, state.cryingMinutesContinuous) 
        : (state.comfort < 50 ? 7 : 3);

      const currentStats = prevCaregiverStats || {
        sootheAttempts: 0,
        sootheSuccesses: 0,
        avgTimeToComfortMinutes: 5,
        affinityScore: 50
      };

      const newAttempts = currentStats.sootheAttempts + 1;
      const newSuccesses = currentStats.sootheSuccesses + (isSuccess ? 1 : 0);
      const newAvgTime = isSuccess
        ? parseFloat((((currentStats.avgTimeToComfortMinutes * currentStats.sootheSuccesses) + timeToSoothe) / newSuccesses).toFixed(1))
        : currentStats.avgTimeToComfortMinutes;

      const successRatio = newSuccesses / newAttempts;
      const speedScore = Math.max(0, Math.min(20, (12 - newAvgTime) * 2));
      const expBonus = Math.min(10, newSuccesses * 2);
      const rawAffinity = Math.round((successRatio * 70) + speedScore + expBonus);
      const newAffinityScore = Math.max(10, Math.min(100, rawAffinity));

      nextState.caregiverEffectiveness = {
        ...(nextState.caregiverEffectiveness || {}),
        [activeParentId]: {
          sootheAttempts: newAttempts,
          sootheSuccesses: newSuccesses,
          avgTimeToComfortMinutes: newAvgTime,
          lastSoothedTimestamp: simTime,
          affinityScore: newAffinityScore
        }
      };
    }

    // Update active parent confidence and stress based on effectiveness and caregiver track-record
    nextParents = nextParents.map(p => {
      if (p.id === activeParentId && !isAutopilot) {
        const baseConfDelta = effectiveness === 'excellent' ? +4 : effectiveness === 'moderate' ? +2 : -2;
        const confDelta = baseConfDelta + (effectiveness !== 'ineffective' ? caregiverConfidenceBonus : 0);
        const strDelta = effectiveness === 'excellent' ? -8 : effectiveness === 'moderate' ? -3 : +5;
        return {
          ...p,
          confidence: Math.max(10, Math.min(100, p.confidence + confDelta)),
          stressLevel: Math.max(0, Math.min(100, p.stressLevel + strDelta)),
          knowledgeScore: Math.min(100, p.knowledgeScore + 1)
        };
      }
      return p;
    });

    const record: CareActionRecord = {
      id: makeId('act', simTime),
      actionType: actionType as any,
      timestamp: simTime,
      performedByParentId: isAutopilot ? 'autopilot' : activeParentId,
      source,
      details: feedback,
      effectiveness,
      deltaSummary
    };

    return {
      nextState,
      nextParents,
      nextBaby: { ...baby, personality },
      record,
      feedbackMessage: feedback
    };
  }

  /**
   * Computes high-level score report
   */
  static calculateScore(
    babyState: BabyState,
    parents: Parent[],
    actionRecords: CareActionRecord[],
    events: SimulationEvent[],
    userProfile: UserProfile
  ): ScoreReport {
    // 1. Baby Wellbeing (0 to 100)
    // Higher comfort, lower hunger, healthy sleep
    const babyWellbeing = Math.round(
      (babyState.comfort * 0.45) +
      ((100 - babyState.hunger) * 0.35) +
      ((100 - babyState.gasDiscomfort) * 0.20)
    );

    // 2. Parent Wellbeing (0 to 100)
    // High energy, low stress, low sleep debt
    const primaryParent = parents.find(p => p.id === userProfile.activeParentId) || parents[0];
    const parentWellbeing = Math.round(
      (primaryParent.energy * 0.35) +
      ((100 - primaryParent.stressLevel) * 0.45) +
      (Math.max(0, 100 - (primaryParent.sleepDebtHours * 5)) * 0.20)
    );

    // 3. Parenting Confidence
    const parentingConfidence = Math.round(primaryParent.confidence);

    // 4. Relationship Score (for two-parent households)
    let relationshipScore = 85;
    if (userProfile.householdType === 'two_parent' && parents.length >= 2) {
      const stressDiff = Math.abs(parents[0].stressLevel - parents[1].stressLevel);
      const avgStress = (parents[0].stressLevel + parents[1].stressLevel) / 2;
      relationshipScore = Math.max(20, Math.min(100, Math.round(100 - (avgStress * 0.4) - (stressDiff * 0.2))));
    }

    // 5. Responsiveness Rate
    const totalEvents = events.length;
    const resolvedEvents = events.filter(e => e.resolved).length;
    const responsivenessRate = totalEvents > 0 ? Math.round((resolvedEvents / totalEvents) * 100) : 100;

    // 6. Overall Care Score
    const overall = Math.round(
      (babyWellbeing * 0.4) +
      (parentWellbeing * 0.25) +
      (parentingConfidence * 0.2) +
      (responsivenessRate * 0.15)
    );

    return {
      babyWellbeingScore: Math.min(100, Math.max(0, babyWellbeing)),
      parentWellbeingScore: Math.min(100, Math.max(0, parentWellbeing)),
      parentingConfidenceScore: Math.min(100, Math.max(0, parentingConfidence)),
      relationshipScore: Math.min(100, Math.max(0, relationshipScore)),
      overallCareScore: Math.min(100, Math.max(0, overall)),
      responsivenessRatePercent: responsivenessRate,
      totalInteractions: actionRecords.length,
      nighttimeWakingsHandled: events.filter(e => (e.type === 'night_waking' || e.type === 'sleep_regression') && e.resolved).length
    };
  }
}

