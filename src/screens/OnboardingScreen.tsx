/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HouseholdType, UserMotivation } from '../types';
import { User, Users, Compass, Heart, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';

interface OnboardingScreenProps {
  onNext: (data: { motivation: UserMotivation; householdType: HouseholdType }) => void;
  onBack: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNext, onBack }) => {
  const [motivation, setMotivation] = useState<UserMotivation>('planning_children');
  const [householdType, setHouseholdType] = useState<HouseholdType>('two_parent');

  const motivations: { id: UserMotivation; title: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    {
      id: 'planning_children',
      title: 'Actively Planning for Children',
      desc: 'Preparing emotionally and practically for family expansion.',
      icon: Calendar
    },
    {
      id: 'newly_married',
      title: 'Newly Married / Cohabiting Couple',
      desc: 'Exploring how newborn demands affect balance and partnership.',
      icon: Heart
    },
    {
      id: 'curious_adult',
      title: 'Curious Adult / Life Explorer',
      desc: 'Curious what genuine modern caregiving actually feels like.',
      icon: Compass
    }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-stone-900 text-stone-100 animate-in fade-in duration-200 overflow-y-auto">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-teal-400 font-bold font-mono">Step 1 of 4</span>
            <h2 className="text-lg font-bold text-stone-100">Personalize Your Simulation</h2>
          </div>
        </div>

        {/* Section 1: Household Structure */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-stone-300 block">
            Caregiving Household Setup
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHouseholdType('two_parent')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                householdType === 'two_parent'
                  ? 'bg-teal-950/60 border-teal-500 ring-1 ring-teal-500/50 text-stone-100'
                  : 'bg-stone-800/40 border-stone-700/60 text-stone-400 hover:bg-stone-800/70'
              }`}
            >
              <Users className={`w-5 h-5 ${householdType === 'two_parent' ? 'text-teal-400' : 'text-stone-400'}`} />
              <div>
                <p className="text-xs font-bold text-stone-100">Two Parents</p>
                <p className="text-[10px] text-stone-400 leading-tight mt-0.5">
                  Share night shifts, workload division, and relationship dynamics.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setHouseholdType('single')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                householdType === 'single'
                  ? 'bg-teal-950/60 border-teal-500 ring-1 ring-teal-500/50 text-stone-100'
                  : 'bg-stone-800/40 border-stone-700/60 text-stone-400 hover:bg-stone-800/70'
              }`}
            >
              <User className={`w-5 h-5 ${householdType === 'single' ? 'text-teal-400' : 'text-stone-400'}`} />
              <div>
                <p className="text-xs font-bold text-stone-100">Single Parent</p>
                <p className="text-[10px] text-stone-400 leading-tight mt-0.5">
                  Solo caregiving with intense focus on personal endurance.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Motivation */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-stone-300 block">
            What brings you to Parenthood?
          </label>
          <div className="space-y-2">
            {motivations.map((m) => {
              const isSelected = motivation === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMotivation(m.id)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 ${
                    isSelected
                      ? 'bg-teal-950/50 border-teal-500 ring-1 ring-teal-500/40 text-stone-100'
                      : 'bg-stone-800/40 border-stone-700/50 text-stone-400 hover:bg-stone-800/70'
                  }`}
                >
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    isSelected 
                      ? 'bg-teal-900/80 border-teal-600 text-teal-300' 
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <p className="font-semibold text-stone-200">{m.title}</p>
                    <p className="text-[11px] text-stone-400 leading-normal">{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="pt-6">
        <button
          onClick={() => onNext({ motivation, householdType })}
          className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-950/50"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
