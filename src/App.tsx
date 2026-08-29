/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  AppScreen, 
  Baby, 
  BabyState, 
  CareActionRecord, 
  DayLog,
  DifficultyMode, 
  UnitSystem,
  HouseholdType, 
  JournalEntry, 
  Milestone, 
  Parent, 
  ScoreReport, 
  SimulationEvent, 
  SimulationSettings, 
  UserMotivation, 
  UserProfile 
} from './types';
import { SimulationEngine } from './simulation/engine';
import { runAwayCatchup } from './simulation/autopilot';
import { getCareDayNumber, getDevelopmentalAgeDays, isJourneyComplete } from './simulation/clock';
import { accumulateAction, accumulateTick } from './simulation/dayLog';
import { Disclaimer } from './components/Disclaimer';
import { 
  loadSavedAppData, 
  saveAppData, 
  resetAppStorage, 
  getDefaultSettings 
} from './simulation/storage';
import { INITIAL_MILESTONES } from './simulation/initialData';
import { soundFx } from './utils/audio';

import { AndroidFrame } from './components/AndroidFrame';
import { TopAppBar, BottomNavigationBar } from './components/Navigation';
import { ActionModal } from './components/ActionModal';

import { WelcomeScreen } from './screens/WelcomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ParentProfileScreen } from './screens/ParentProfileScreen';
import { DifficultyScreen } from './screens/DifficultyScreen';
import { CreateBabyScreen } from './screens/CreateBabyScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { NeedsStatusScreen } from './screens/NeedsStatusScreen';
import { ParentStatusScreen } from './screens/ParentStatusScreen';
import { EventHistoryScreen } from './screens/EventHistoryScreen';
import { JournalScreen } from './screens/JournalScreen';
import { SettingsScreen } from './screens/SettingsScreen';

// Load saved data and apply the away policy (bounded autopilot catch-up). See simulation/autopilot.ts.
function getInitialDataWithCatchup() {
  const loaded = loadSavedAppData();
  if (!loaded.baby || !loaded.babyState) return loaded;
  const now = Date.now();
  const result = runAwayCatchup(
    {
      baby: loaded.baby,
      babyState: loaded.babyState,
      parents: loaded.parents,
      userProfile: loaded.userProfile,
      settings: loaded.settings,
      events: loaded.events,
      actionRecords: loaded.actionRecords,
      milestones: loaded.milestones,
      dayLogs: loaded.dayLogs,
    },
    now
  );
  return {
    ...loaded,
    baby: result.baby,
    babyState: result.babyState,
    parents: result.parents,
    settings: { ...result.settings, lastRealTimestampMs: now },
    events: result.events,
    actionRecords: result.actionRecords,
    milestones: result.milestones,
    dayLogs: result.dayLogs,
  };
}

export default function App() {
  // Load local persistent storage data with continuity catch-up
  const initialData = useRef(getInitialDataWithCatchup()).current;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialData.userProfile);
  const [baby, setBaby] = useState<Baby | null>(initialData.baby);
  const [babyState, setBabyState] = useState<BabyState | null>(initialData.babyState);
  const [parents, setParents] = useState<Parent[]>(initialData.parents);
  const [settings, setSettings] = useState<SimulationSettings>(initialData.settings);
  const [actionRecords, setActionRecords] = useState<CareActionRecord[]>(initialData.actionRecords);
  const [events, setEvents] = useState<SimulationEvent[]>(initialData.events);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(initialData.journalEntries);
  const [milestones, setMilestones] = useState<Milestone[]>(initialData.milestones);
  const [dayLogs, setDayLogs] = useState<DayLog[]>(initialData.dayLogs);

  // Active Screen state
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(
    initialData.baby ? 'dashboard' : 'welcome'
  );

  // Action Modal state
  const [activeActionModal, setActiveActionModal] = useState<string | null>(null);
  // Short-lived feedback after an action ("what happened after I did it?")
  const [feedback, setFeedback] = useState<{ text: string; tone: 'good' | 'neutral' | 'bad' } | null>(null);
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 7000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Sync sound setting to audio synthesizer
  useEffect(() => {
    soundFx.setEnabled(settings.soundEffectsEnabled);
  }, [settings.soundEffectsEnabled]);

  // Persist state to localStorage on changes
  useEffect(() => {
    saveAppData({
      userProfile,
      baby,
      babyState,
      parents,
      settings: {
        ...settings,
        lastRealTimestampMs: Date.now(),
      },
      actionRecords,
      events,
      journalEntries,
      milestones,
      dayLogs,
    });
  }, [userProfile, baby, babyState, parents, settings, actionRecords, events, journalEntries, milestones, dayLogs]);

  // Main Simulation Loop Timer (Runs every 1 second)
  useEffect(() => {
    if (!baby || !babyState || settings.isPaused) return;

    const interval = setInterval(() => {
      const deltaSimMs = 1000 * settings.timeSpeed;
      const activeParentId = userProfile?.activeParentId || parents[0]?.id || 'parent_primary';

      const result = SimulationEngine.tick(
        baby,
        babyState,
        parents,
        activeParentId,
        settings,
        deltaSimMs,
        events,
        milestones
      );

      const tickDay = Math.max(0, Math.floor((settings.simulatedTimeMs + deltaSimMs - baby.birthTimestamp) / 86400000));
      setDayLogs(prev => accumulateTick(prev, tickDay, babyState, result.nextState, deltaSimMs / 60000, result.nextParents, result.newEvents));

      setBaby(result.nextBaby);
      setBabyState(result.nextState);
      setParents(result.nextParents);
      setSettings(prev => ({ 
        ...prev, 
        simulatedTimeMs: prev.simulatedTimeMs + deltaSimMs,
        lastRealTimestampMs: Date.now(),
      }));

      if (result.newEvents.length > 0) {
        setEvents(prev => [...result.newEvents, ...prev]);
        if (result.newEvents.some(e => e.severity === 'urgent' || e.severity === 'warning')) {
          soundFx.playAlert();
        }
      }

      setMilestones(result.updatedMilestones);
    }, 1000);

    return () => clearInterval(interval);
  }, [baby, babyState, parents, settings, events, milestones, userProfile]);

  // When the tab is hidden and shown again, run the away policy so a long background pause behaves like closing the app
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !baby || !babyState) return;
      const now = Date.now();
      const result = runAwayCatchup(
        { baby, babyState, parents, userProfile, settings, events, actionRecords, milestones, dayLogs },
        now
      );
      if (result.processedSimMs > 0) {
        setBaby(result.baby);
        setBabyState(result.babyState);
        setParents(result.parents);
        setSettings(result.settings);
        setEvents(result.events);
        setActionRecords(result.actionRecords);
        setMilestones(result.milestones);
        setDayLogs(result.dayLogs);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [baby, babyState, parents, userProfile, settings, events, actionRecords, milestones, dayLogs]);

  // Calculate score report
  const scoreReport: ScoreReport = babyState && userProfile ? SimulationEngine.calculateScore(
    babyState,
    parents,
    actionRecords,
    events,
    userProfile
  ) : {
    babyWellbeingScore: 85,
    parentWellbeingScore: 80,
    parentingConfidenceScore: 70,
    relationshipScore: 85,
    overallCareScore: 80,
    responsivenessRatePercent: 95,
    totalInteractions: actionRecords.length,
    nighttimeWakingsHandled: 0,
  };

  // Handlers for Onboarding Flow
  const handleOnboardingStep1 = (data: { motivation: UserMotivation; householdType: HouseholdType }) => {
    setUserProfile({
      id: `user_${Date.now()}`,
      motivation: data.motivation,
      householdType: data.householdType,
      primaryParentName: 'Alex',
      partnerName: data.householdType === 'two_parent' ? 'Jordan' : undefined,
      onboardingCompleted: false,
      activeParentId: 'parent_primary',
      createdAt: Date.now(),
    });
    setCurrentScreen('parent_profile');
  };

  const handleOnboardingStep2 = (data: { primaryParentName: string; partnerName?: string; parents: Parent[] }) => {
    setUserProfile(prev => prev ? {
      ...prev,
      primaryParentName: data.primaryParentName,
      partnerName: data.partnerName,
    } : null);
    setParents(data.parents);
    setCurrentScreen('difficulty_select');
  };

  const handleOnboardingStep3 = (difficulty: DifficultyMode, nighttimeAlerts: boolean, unitSystem: UnitSystem) => {
    setSettings(prev => ({
      ...prev,
      difficulty,
      nighttimeAlertsEnabled: nighttimeAlerts,
      unitSystem,
    }));
    setCurrentScreen('create_baby');
  };

  const handleBabyCreation = (newBaby: Baby) => {
    const initialBabyState: BabyState = {
      hunger: 35,
      sleepiness: 25,
      diaperSoiled: 10,
      diaperType: 'clean',
      gasDiscomfort: 15,
      comfort: 88,
      energy: 85,
      isSleeping: false,
      sleepMinutesElapsed: 0,
      awakeMinutesElapsed: 20,
      healthState: 'healthy',
      mood: 'quiet_alert',
      lastFedTimestamp: Date.now() - (45 * 60 * 1000),
      lastDiaperTimestamp: Date.now() - (30 * 60 * 1000),
      lastBurpedTimestamp: Date.now() - (45 * 60 * 1000),
      lastSootherTimestamp: Date.now(),
      lastTummyTimeTimestamp: Date.now() - (120 * 60 * 1000),
      cryingMinutesContinuous: 0,
    };

    setBaby(newBaby);
    setBabyState(initialBabyState);
    setUserProfile(prev => prev ? { ...prev, onboardingCompleted: true } : null);
    setSettings(prev => ({ ...prev, simulatedTimeMs: Date.now(), lastRealTimestampMs: Date.now(), isPaused: false }));
    setCurrentScreen('dashboard');
    soundFx.playSuccessChime();
  };

  // Care Action Handler
  const handlePerformAction = (actionType: string, params?: any) => {
    if (!baby || !babyState) return;

    const activeParentId = userProfile?.activeParentId || parents[0]?.id || 'parent_primary';
    const result = SimulationEngine.applyAction(
      actionType,
      baby,
      babyState,
      parents,
      activeParentId,
      settings,
      params
    );

    setBabyState(result.nextState);
    setParents(result.nextParents);
    setBaby(result.nextBaby);
    setActionRecords(prev => [result.record, ...prev]);
    setDayLogs(prev => accumulateAction(prev, getCareDayNumber(baby, settings), result.record));

    // Resolve active crying events if comforted or fed
    if (actionType === 'feed' || actionType === 'cuddle' || actionType === 'rock' || actionType === 'change_diaper' || actionType === 'burp' || actionType === 'put_to_sleep') {
      setEvents(prev => prev.map(e => {
        if (!e.resolved && (e.type === 'crying_spell' || e.type === 'hunger_cue' || e.type === 'diaper_blowout')) {
          return { ...e, resolved: true, resolvedAt: settings.simulatedTimeMs };
        }
        return e;
      }));
    }

    setFeedback({
      text: result.feedbackMessage,
      tone: result.record.effectiveness === 'excellent' ? 'good' : result.record.effectiveness === 'ineffective' ? 'bad' : 'neutral'
    });
    if (result.record.effectiveness !== 'ineffective') soundFx.playSuccessChime();
  };

  // Switch Active Caregiver in Two-Parent Mode
  const handleSwitchActiveParent = (parentId: string) => {
    setUserProfile(prev => prev ? { ...prev, activeParentId: parentId } : null);
    soundFx.playSuccessChime();
  };

  // Resolve Event
  const handleResolveEvent = (eventId: string) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, resolved: true, resolvedAt: settings.simulatedTimeMs } : e));
  };

  // Reset Simulation
  const handleResetSimulation = () => {
    resetAppStorage();
    setUserProfile(null);
    setBaby(null);
    setBabyState(null);
    setParents([]);
    setSettings(getDefaultSettings());
    setActionRecords([]);
    setEvents([]);
    setJournalEntries([]);
    setMilestones(INITIAL_MILESTONES);
    setDayLogs([]);
    setCurrentScreen('welcome');
  };

  const unreadEventsCount = events.filter(e => !e.resolved).length;
  const ageDays = baby ? getDevelopmentalAgeDays(baby) : 0;
  const careDay = baby ? getCareDayNumber(baby, settings) : 0;
  const journeyComplete = baby ? isJourneyComplete(baby) : false;

  const isMainScreen = ['dashboard', 'needs_status', 'parent_status', 'event_history', 'journal', 'settings'].includes(currentScreen);

  return (
    <AndroidFrame
      simulatedTimeMs={settings.simulatedTimeMs}
      soundEnabled={settings.soundEffectsEnabled}
      onToggleSound={() => setSettings(prev => ({ ...prev, soundEffectsEnabled: !prev.soundEffectsEnabled }))}
    >
      {/* Top App Bar for Main Simulation Screens */}
      {isMainScreen && (
        <TopAppBar
          title={
            currentScreen === 'dashboard' ? 'Parenthood' :
            currentScreen === 'needs_status' ? 'Baby Needs' :
            currentScreen === 'parent_status' ? 'Parent State' :
            currentScreen === 'event_history' ? 'Timeline' :
            currentScreen === 'journal' ? 'Baby Journal' : 'Settings'
          }
          babyName={baby?.name}
          ageDays={ageDays}
          careDay={careDay}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        />
      )}

      {/* Screen Router */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentScreen === 'welcome' && (
          <WelcomeScreen onStart={() => setCurrentScreen('onboarding')} />
        )}

        {currentScreen === 'onboarding' && (
          <OnboardingScreen
            onNext={handleOnboardingStep1}
            onBack={() => setCurrentScreen('welcome')}
          />
        )}

        {currentScreen === 'parent_profile' && userProfile && (
          <ParentProfileScreen
            householdType={userProfile.householdType}
            onNext={handleOnboardingStep2}
            onBack={() => setCurrentScreen('onboarding')}
          />
        )}

        {currentScreen === 'difficulty_select' && (
          <DifficultyScreen
            onNext={handleOnboardingStep3}
            onBack={() => setCurrentScreen('parent_profile')}
          />
        )}

        {currentScreen === 'create_baby' && (
          <CreateBabyScreen
            unitSystem={settings.unitSystem}
            onComplete={handleBabyCreation}
            onBack={() => setCurrentScreen('difficulty_select')}
          />
        )}

        {currentScreen === 'dashboard' && baby && babyState && userProfile && (
          <DashboardScreen
            baby={baby}
            babyState={babyState}
            parents={parents}
            userProfile={userProfile}
            settings={settings}
            scoreReport={scoreReport}
            recentEvents={events}
            onOpenActionModal={(action) => setActiveActionModal(action)}
            onSwitchActiveParent={handleSwitchActiveParent}
            onResolveEvent={handleResolveEvent}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}

        {currentScreen === 'needs_status' && baby && babyState && (
          <NeedsStatusScreen
            baby={baby}
            babyState={babyState}
            scoreReport={scoreReport}
            simulatedTimeMs={settings.simulatedTimeMs}
            unitSystem={settings.unitSystem}
            onOpenAction={(action) => setActiveActionModal(action)}
          />
        )}

        {currentScreen === 'parent_status' && userProfile && (
          <ParentStatusScreen
            parents={parents}
            userProfile={userProfile}
            scoreReport={scoreReport}
            baby={baby || undefined}
            babyState={babyState || undefined}
            onSwitchActiveParent={handleSwitchActiveParent}
            onOpenSelfCare={() => setActiveActionModal('parent_break')}
            actionRecords={actionRecords}
            events={events}
            dayLogs={dayLogs}
          />
        )}

        {currentScreen === 'event_history' && (
          <EventHistoryScreen
            events={events}
            actions={actionRecords}
            onResolveEvent={handleResolveEvent}
          />
        )}

        {currentScreen === 'journal' && baby && (
          <JournalScreen
            baby={baby}
            parents={parents}
            milestones={milestones}
            journalEntries={journalEntries}
            recentEvents={events}
            actionRecords={actionRecords}
            dayLogs={dayLogs}
            babyState={babyState || undefined}
            simulatedTimeMs={settings.simulatedTimeMs}
            onAddJournalEntry={(entry) => setJournalEntries(prev => [entry, ...prev])}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
            onResetSimulation={handleResetSimulation}
          />
        )}
      </main>

      {isMainScreen && journeyComplete && (
        <div className="px-4 py-2 text-[11px] text-teal-100 bg-teal-950/80 border-t border-teal-800 text-center">
          {baby?.name} has reached six months. The final report arrives in a later update — you can keep caring for now.
        </div>
      )}
      {isMainScreen && <Disclaimer />}

      {/* Bottom Navigation Bar for Main Simulation Screens */}
      {isMainScreen && (
        <BottomNavigationBar
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          unreadEventsCount={unreadEventsCount}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        />
      )}

      {/* Interactive Action Modal */}
      {baby && babyState && userProfile && (
        <ActionModal
          isOpen={activeActionModal !== null}
          actionType={activeActionModal}
          baby={baby}
          babyState={babyState}
          parents={parents}
          userProfile={userProfile}
          unitSystem={settings.unitSystem}
          onClose={() => setActiveActionModal(null)}
          onConfirmAction={handlePerformAction}
        />
      )}

      {/* Action feedback toast */}
      {feedback && (
        <div
          onClick={() => setFeedback(null)}
          className={`absolute left-3 right-3 bottom-24 z-40 p-3 rounded-2xl border text-xs leading-relaxed shadow-xl cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            feedback.tone === 'good' ? 'bg-teal-950/95 border-teal-700 text-teal-100'
            : feedback.tone === 'bad' ? 'bg-rose-950/95 border-rose-800 text-rose-100'
            : 'bg-stone-800/95 border-stone-600 text-stone-100'
          }`}
        >
          {feedback.text}
        </div>
      )}
    </AndroidFrame>
  );
}
