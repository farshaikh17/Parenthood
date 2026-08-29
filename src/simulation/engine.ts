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
  DifficultyMode, 
  Milestone, 
  Parent, 
  ScoreReport, 
  SimulationEvent, 
  SimulationSettings, 
  UserProfile 
} from '../types';
import { TEMPERAMENTS } from './initialData';
import { EVENT_NOTES, MILESTONE_NOTES } from '../content/copy';
import { formatVolume } from '../utils/units';

/** Stable-enough IDs based on simulation time (not wall clock) plus a short random suffix. */
export function makeId(prefix: string, simTime: number): string {
  return `${prefix}_${Math.floor(simTime)}_${Math.random().toString(36).slice(2, 7)}`;
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
    const tempConfig = TEMPERAMENTS[baby.temperament] || TEMPERAMENTS.easygoing;
    const diffMultiplier = settings.difficulty === 'hardcore' ? 1.35 : 1.0;
    
    // Delta in simulated minutes
    const deltaMinutes = deltaSimulatedMs / (60 * 1000);
    if (deltaMinutes <= 0) {
      return { nextBaby: baby, nextState: state, nextParents: parents, newEvents: [], updatedMilestones: milestones };
    }

    const nextState: BabyState = { ...state };
    const nextBaby: Baby = { ...baby };
    let nextParents = parents.map(p => ({ ...p }));
    const newEvents: SimulationEvent[] = [];
    const updatedMilestones = milestones.map(m => ({ ...m }));

    const simTime = settings.simulatedTimeMs + deltaSimulatedMs;
    const simDate = new Date(simTime);
    const currentHour = simDate.getHours();
    const isNighttime = isNighttimeHour(currentHour, settings);

    // 1. Calculate Age in Days, Developmental Stage & Growth
    const ageDays = Math.max(0, Math.floor((simTime - baby.birthTimestamp) / (24 * 60 * 60 * 1000)));
    const stage = SimulationEngine.getDevelopmentalStage(ageDays);
    
    // Growth is a smooth simulation heuristic (roughly 25 g/day in the first ~3 months, ~17 g/day after; ~0.09 cm/day).
    // Not a growth chart. Real growth is assessed by health professionals.
    const gramsPerDay = ageDays < 90 ? 25 : 17;
    const gainedGrams = ageDays < 90 ? ageDays * 25 : (90 * 25) + ((ageDays - 90) * 17);
    const fractionalDayGain = (deltaMinutes / (24 * 60)) * gramsPerDay;
    nextBaby.currentWeightGrams = Math.round(baby.birthWeightGrams + gainedGrams + fractionalDayGain);
    nextBaby.currentLengthCm = parseFloat((baby.birthLengthCm + (ageDays * 0.09)).toFixed(1));

    // Bounded 4-month sleep regression window (days 120 to 134, lasting 2 weeks)
    const isSleepRegression = stage === 'infant_4_6mo' && ageDays >= 120 && ageDays <= 134;

    // 2. Hunger Progression (Milk & Complementary Solids)
    // Milk hunger progression (every 2-3.5 hours depending on stage)
    const baseHungerMinutes = stage === 'infant_4_6mo' ? 200 : stage === 'social_infant' ? 180 : 150;
    const hungerRatePerMinute = (100 / (baseHungerMinutes * tempConfig.hungerToleranceMultiplier)) * diffMultiplier;
    nextState.hunger = Math.min(100, Math.max(0, nextState.hunger + (hungerRatePerMinute * deltaMinutes)));

    // Solid food appetite progression in 4-6 month stage (alongside, not replacing milk)
    if (stage === 'infant_4_6mo') {
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

      // Restorative sleep reduces sleepiness
      const sleepCycleFactor = stage === 'infant_4_6mo' ? 2.0 : stage === 'social_infant' ? 1.75 : 1.5;
      const sleepRecoveryRate = 100 / (tempConfig.sleepCycleDurationMinutes * sleepCycleFactor);
      nextState.sleepiness = Math.max(0, nextState.sleepiness - (sleepRecoveryRate * deltaMinutes));

      // Wake up conditions tailored by daytime vs nighttime and developmental stage
      let naturalCycleMinutes = tempConfig.sleepCycleDurationMinutes;
      let hungerWakeThreshold = 70;
      let diaperWakeThreshold = 75;
      let gasWakeThreshold = 70;

      if (isNighttime) {
        // Nighttime biological patterns: higher waking sensitivity to hunger and shorter cycle transitions
        if (stage === 'newborn') {
          naturalCycleMinutes = tempConfig.sleepCycleDurationMinutes * 0.85; // ~45-55m active sleep transitions
          hungerWakeThreshold = 45; // Newborns cannot sleep through hunger
          diaperWakeThreshold = 60;
          gasWakeThreshold = 50;
        } else if (stage === 'social_infant') {
          naturalCycleMinutes = tempConfig.sleepCycleDurationMinutes * 1.1; // ~60-80m cycles
          hungerWakeThreshold = 55;
          diaperWakeThreshold = 65;
          gasWakeThreshold = 55;
        } else {
          // 4-6 month infant
          naturalCycleMinutes = isSleepRegression 
            ? tempConfig.sleepCycleDurationMinutes * 0.75 // 4-month sleep leap fragments nocturnal cycles
            : tempConfig.sleepCycleDurationMinutes * 1.6; // Longer consolidated nocturnal stretches
          hungerWakeThreshold = isSleepRegression ? 50 : 65;
          diaperWakeThreshold = 70;
          gasWakeThreshold = 60;
        }
      }

      const naturalWakeThreshold = nextState.sleepMinutesElapsed > naturalCycleMinutes;
      const distressWakeThreshold = nextState.hunger > hungerWakeThreshold || 
                                    nextState.diaperSoiled > diaperWakeThreshold || 
                                    nextState.gasDiscomfort > gasWakeThreshold;

      // Sleep regression light sleep transitions
      const regressionWake = isSleepRegression && nextState.sleepMinutesElapsed > 35 && nextState.sleepiness < 45 && Math.random() < (0.015 * deltaMinutes);

      if ((naturalWakeThreshold && nextState.sleepiness < 15) || distressWakeThreshold || regressionWake) {
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
              title: isSleepRegression ? '4-Month Sleep Regression Awakening' : 'Nighttime Awakening',
              source: 'system',
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

      // Safe Wake Windows based on Developmental Stage:
      // Newborn (0-8w): 45-75m (~65m)
      // Social Infant (8-17w): 90-120m (~105m)
      // 4-6 Month Infant (17-26w): 120-150m (~135m)
      let maxWakeWindowMinutes = 65;
      if (stage === 'social_infant') {
        maxWakeWindowMinutes = 105;
      } else if (stage === 'infant_4_6mo') {
        maxWakeWindowMinutes = 135;
      }

      // During sleep regression, fatigue accumulates temporarily faster
      const regressionFatigueMultiplier = isSleepRegression ? 1.25 : 1.0;
      const fatigueRate = (100 / maxWakeWindowMinutes) * (settings.difficulty === 'hardcore' ? 1.2 : 1.0) * regressionFatigueMultiplier;
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
            title: `${baby.name} rolled over`,
            description: `${baby.name} rolled over on the play mat for the first time.`,
            educationalNote: EVENT_NOTES.rolls_over.body,
            severity: 'info',
            resolved: true,
            resolvedAt: simTime
          });

          // Also unlock the rolls_over milestone if present
          const rollMilestoneIdx = updatedMilestones.findIndex(m => m.id === 'rolls_over');
          if (rollMilestoneIdx !== -1 && !updatedMilestones[rollMilestoneIdx].unlocked) {
            updatedMilestones[rollMilestoneIdx] = {
              ...updatedMilestones[rollMilestoneIdx],
              unlocked: true,
              unlockedAtTimestamp: simTime
            };
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
    if (minutesSinceFeeding < 60 && minutesSinceBurp > 45) {
      nextState.gasDiscomfort = Math.min(100, nextState.gasDiscomfort + (0.35 * deltaMinutes));
    } else {
      nextState.gasDiscomfort = Math.max(0, nextState.gasDiscomfort - (0.15 * deltaMinutes));
    }

    // 6. Comfort Calculation
    const hungerPenalty = Math.max(0, (nextState.hunger - 40) * 1.3);
    const solidFoodPenalty = (stage === 'infant_4_6mo' && (nextState.solidFoodHunger || 0) > 60) ? ((nextState.solidFoodHunger || 0) - 60) * 0.4 : 0;
    const diaperPenalty = Math.max(0, (nextState.diaperSoiled - 40) * 1.0);
    const gasPenalty = nextState.gasDiscomfort * 0.9;
    const overtiredPenalty = nextState.sleepiness > 80 && !nextState.isSleeping ? (nextState.sleepiness - 80) * 2.0 : 0;
    
    const totalDistress = hungerPenalty + solidFoodPenalty + diaperPenalty + gasPenalty + overtiredPenalty;
    nextState.comfort = Math.max(0, Math.min(100, 100 - totalDistress));

    // 7. Mood & Alert/Social State Evaluation
    let calculatedMood: BabyMood = 'quiet_alert';

    if (nextState.isSleeping) {
      calculatedMood = nextState.comfort > 60 ? 'sleeping_deep' : 'sleeping_light';
      nextState.cryingMinutesContinuous = 0;
    } else {
      // Social infant & 4-6mo infant are more easily playful and alert
      const playThreshold = stage !== 'newborn' ? 65 : 75;
      if (nextState.comfort > playThreshold && nextState.hunger < 45 && nextState.sleepiness < 60) {
        calculatedMood = (nextState.awakeMinutesElapsed > 10 || stage !== 'newborn') ? 'playful' : 'quiet_alert';
        nextState.cryingMinutesContinuous = 0;
      } else if (nextState.comfort > 50 && nextState.sleepiness > 70) {
        calculatedMood = 'drowsy';
        nextState.cryingMinutesContinuous = 0;
      } else if (nextState.comfort <= 50 && nextState.comfort > 25) {
        calculatedMood = 'fussy';
        nextState.cryingMinutesContinuous += deltaMinutes;
      } else if (nextState.comfort <= 25 && nextState.comfort > 10) {
        calculatedMood = 'active_crying';
        nextState.cryingMinutesContinuous += deltaMinutes;
      } else {
        calculatedMood = 'inconsolable';
        nextState.cryingMinutesContinuous += deltaMinutes;
      }
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

    // 9. Developmental Milestones Check (Reusing existing unlock mechanism)
    for (let i = 0; i < updatedMilestones.length; i++) {
      const m = updatedMilestones[i];
      if (!m.unlocked && ageDays >= m.minAgeDays) {
        let conditionMet = false;
        if (m.id === 'focus_faces' && ageDays >= 3) conditionMet = true;
        if (m.id === 'first_social_smile' && ageDays >= 28 && nextState.comfort > 70) conditionMet = true;
        if (m.id === 'tummy_head_lift' && ageDays >= 14) conditionMet = true;
        if (m.id === 'cooing_sounds' && ageDays >= 45 && (nextState.mood === 'playful' || stage !== 'newborn')) conditionMet = true;
        if (m.id === 'hands_to_mouth' && ageDays >= 35) conditionMet = true;
        if (m.id === 'longer_night_stretch' && ageDays >= 60 && nextState.sleepMinutesElapsed >= 240) conditionMet = true;
        if (m.id === 'entering_social_infant' && ageDays >= 57) conditionMet = true;
        if (m.id === 'entering_infant_4_6mo' && ageDays >= 120) conditionMet = true;
        if (m.id === 'sleep_regression_4mo' && ageDays >= 120) conditionMet = true;
        if (m.id === 'rolls_over' && ageDays >= 120 && (nextState.awakeMinutesElapsed > 10 || ageDays >= 135)) conditionMet = true;
        if (m.id === 'first_solid_food' && ageDays >= 120 && nextState.lastSolidsTimestamp !== undefined) conditionMet = true;

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
    record: CareActionRecord;
    feedbackMessage: string;
    resolvedEventIds?: string[];
  } {
    const source = options.source || 'user';
    const isAutopilot = source === 'autopilot';
    const nextState = { ...state };
    let nextParents = parents.map(p => ({ ...p }));
    const simTime = settings.simulatedTimeMs;
    const tempConfig = TEMPERAMENTS[baby.temperament] || TEMPERAMENTS.easygoing;
    const ageDays = Math.max(0, Math.floor((simTime - baby.birthTimestamp) / (24 * 60 * 60 * 1000)));
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
        const reduction = Math.min(nextState.hunger, (feedAmountMl / 30) * 25);
        nextState.hunger = Math.max(0, nextState.hunger - reduction);
        nextState.lastFedTimestamp = simTime;
        // Feeding introduces air/gas
        nextState.gasDiscomfort = Math.min(100, nextState.gasDiscomfort + 25);
        nextState.comfort = Math.min(100, nextState.comfort + 20);
        
        effectiveness = reduction > 30 ? 'excellent' : 'moderate';
        feedback = `${baby.name} took ${formatVolume(feedAmountMl, settings.unitSystem || 'imperial')}.${reduction >= 30 ? ' Hunger eased.' : ' Still seems hungry.'} A burp may be needed.`;
        
        deltaSummary.hunger = -reduction;
        deltaSummary.gas = +25;
        deltaSummary.comfort = +20;
        break;
      }

      case 'feed_solids': {
        if (stage !== 'infant_4_6mo') {
          feedback = `${baby.name} is only ${ageDays} days old. In this simulation solids are not offered before the 4–6 month stage.`;
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
        const soothingBoost = Math.round(35 * tempConfig.soothabilityMultiplier);
        nextState.comfort = Math.min(100, nextState.comfort + soothingBoost);
        nextState.lastSootherTimestamp = simTime;
        nextState.cryingMinutesContinuous = Math.max(0, nextState.cryingMinutesContinuous - 5);

        // If very sleepy and comfortable, might drift to sleep
        if (nextState.sleepiness > 65 && nextState.hunger < 50 && nextState.gasDiscomfort < 40) {
          nextState.isSleeping = true;
          nextState.sleepMinutesElapsed = 0;
          nextState.mood = 'sleeping_light';
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
          nextState.isSleeping = true;
          nextState.sleepMinutesElapsed = 0;
          nextState.comfort = Math.min(100, nextState.comfort + 10);
          feedback = `Put ${baby.name} down on their back in the cot. They drifted off.`;
          effectiveness = 'excellent';
          deltaSummary.sleepiness = 0;
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
          if (cues.length === 0) cues.push('calm and alert, looking around');
        }
        feedback = `You watch ${baby.name} for a moment: ${cues.join('; ')}.`;
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

