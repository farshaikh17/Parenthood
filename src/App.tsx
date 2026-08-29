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
  DifficultyMode, 
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

// Function to load saved data with bounded catch-up simulation for elapsed real-world time
function getInitialDataWithCatchup() {
  const loaded = loadSavedAppData();
  if (!loaded.baby || !loaded.babyState || loaded.settings.isPaused) {
    return loaded;
  }

  const lastReal = loaded.settings.lastRealTimestampMs || Date.now();
  const now = Date.now();
  const elapsedRealMs = Math.max(0, now - lastReal);

  // If real time has elapsed (> 3 seconds), perform bounded catch-up
  if (elapsedRealMs > 3000) {
    const rawSimulatedDeltaMs = elapsedRealMs * loaded.settings.timeSpeed;
    // Bounded cap to prevent catastrophic unrecoverable state while away (max 12 hours of sim time)
    const maxSimDeltaMs = 12 * 60 * 60 * 1000;
    const effectiveSimDeltaMs = Math.min(rawSimulatedDeltaMs, maxSimDeltaMs);

    if (effectiveSimDeltaMs > 0) {
      // Step through in increments to simulate physiological decay smoothly
      const stepSimMs = Math.max(60 * 1000, Math.min(5 * 60 * 1000, Math.floor(effectiveSimDeltaMs / 20)));
      let currentBaby = loaded.baby;
      let currentState = loaded.babyState;
      let currentParents = loaded.parents;
      let currentEvents = [...loaded.events];
      let currentMilestones = [...loaded.milestones];
      let accumulatedSimMs = 0;
      const activeParentId = loaded.userProfile?.activeParentId || loaded.parents[0]?.id || 'parent_primary';

      while (accumulatedSimMs < effectiveSimDeltaMs) {
        const delta = Math.min(stepSimMs, effectiveSimDeltaMs - accumulatedSimMs);
        const result = SimulationEngine.tick(
          currentBaby,
          currentState,
          currentParents,
          activeParentId,
          loaded.settings,
          delta,
          currentEvents,
          currentMilestones
        );
        currentBaby = result.nextBaby;
        currentState = result.nextState;
        currentParents = result.nextParents;
        currentEvents = [...result.newEvents, ...currentEvents];
        currentMilestones = result.updatedMilestones;
        accumulatedSimMs += delta;
      }

      return {
        ...loaded,
        baby: currentBaby,
        babyState: currentState,
        parents: currentParents,
        events: currentEvents,
        milestones: currentMilestones,
        settings: {
          ...loaded.settings,
          simulatedTimeMs: loaded.settings.simulatedTimeMs + effectiveSimDeltaMs,
          lastRealTimestampMs: now,
        },
      };
    }
  }

  return {
    ...loaded,
    settings: {
      ...loaded.settings,
      lastRealTimestampMs: now,
    },
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

  // Active Screen state
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(
    initialData.baby ? 'dashboard' : 'welcome'
  );

  // Action Modal state
  const [activeActionModal, setActiveActionModal] = useState<string | null>(null);

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
    });
  }, [userProfile, baby, babyState, parents, settings, actionRecords, events, journalEntries, milestones]);

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

  const handleOnboardingStep3 = (difficulty: DifficultyMode, nighttimeAlerts: boolean) => {
    setSettings(prev => ({
      ...prev,
      difficulty,
      nighttimeAlertsEnabled: nighttimeAlerts,
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
      temperatureFahrenheit: 98.6,
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
    setActionRecords(prev => [result.record, ...prev]);

    // Resolve active crying events if comforted or fed
    if (actionType === 'feed' || actionType === 'cuddle' || actionType === 'change_diaper') {
      setEvents(prev => prev.map(e => {
        if (!e.resolved && (e.type === 'crying_spell' || e.type === 'hunger_cue' || e.type === 'diaper_blowout')) {
          return { ...e, resolved: true, resolvedAt: settings.simulatedTimeMs };
        }
        return e;
      }));
    }

    soundFx.playSuccessChime();
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
    setCurrentScreen('welcome');
  };

  const unreadEventsCount = events.filter(e => !e.resolved).length;
  const ageDays = baby ? Math.max(0, Math.floor((settings.simulatedTimeMs - baby.birthTimestamp) / (24 * 60 * 60 * 1000))) : 0;

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
          onClose={() => setActiveActionModal(null)}
          onConfirmAction={handlePerformAction}
        />
      )}
    </AndroidFrame>
  );
}
