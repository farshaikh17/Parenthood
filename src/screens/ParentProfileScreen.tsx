/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HouseholdType, Parent } from '../types';
import { User, Users, Briefcase, ArrowRight, ArrowLeft } from 'lucide-react';

interface ParentProfileScreenProps {
  householdType: HouseholdType;
  onNext: (data: { primaryParentName: string; partnerName?: string; parents: Parent[] }) => void;
  onBack: () => void;
}

export const ParentProfileScreen: React.FC<ParentProfileScreenProps> = ({
  householdType,
  onNext,
  onBack
}) => {
  const [primaryName, setPrimaryName] = useState<string>('Alex');
  const [partnerName, setPartnerName] = useState<string>(householdType === 'two_parent' ? 'Jordan' : '');
  const [primaryWork, setPrimaryWork] = useState<Parent['workStatus']>('parental_leave');
  const [partnerWork, setPartnerWork] = useState<Parent['workStatus']>('full_time');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryName.trim()) return;

    const parents: Parent[] = [
      {
        id: 'parent_primary',
        name: primaryName.trim(),
        role: householdType === 'two_parent' ? 'primary' : 'solo',
        workStatus: primaryWork,
        sleepDebtHours: 0,
        stressLevel: 25,
        confidence: 60,
        knowledgeScore: 50,
        energy: 90
      }
    ];

    if (householdType === 'two_parent' && partnerName.trim()) {
      parents.push({
        id: 'parent_partner',
        name: partnerName.trim(),
        role: 'secondary',
        workStatus: partnerWork,
        sleepDebtHours: 0,
        stressLevel: 20,
        confidence: 55,
        knowledgeScore: 45,
        energy: 95
      });
    }

    onNext({
      primaryParentName: primaryName.trim(),
      partnerName: householdType === 'two_parent' ? partnerName.trim() : undefined,
      parents
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between p-6 bg-stone-900 text-stone-100 animate-in fade-in duration-200 overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-teal-400 font-bold font-mono">Step 2 of 4</span>
            <h2 className="text-lg font-bold text-stone-100">Parent Profiles</h2>
          </div>
        </div>

        {/* Primary Parent Card */}
        <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-teal-300">
            <User className="w-4 h-4" />
            <span>Primary Caregiver</span>
          </div>

          <div>
            <label className="text-xs text-stone-300 block mb-1">Your Name</label>
            <input
              type="text"
              required
              value={primaryName}
              onChange={(e) => setPrimaryName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="text-xs text-stone-300 block mb-1">Current Work / Leave Schedule</label>
            <select
              value={primaryWork}
              onChange={(e) => setPrimaryWork(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="parental_leave">Parental / Maternity Leave (Home full-time)</option>
              <option value="part_time">Part-Time Work (Hybrid Caregiving)</option>
              <option value="full_time">Full-Time Work (High Evening Demand)</option>
              <option value="homemaker">Homemaker</option>
            </select>
          </div>
        </div>

        {/* Partner Card (If Two Parents) */}
        {householdType === 'two_parent' && (
          <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-xs font-semibold text-amber-300">
              <Users className="w-4 h-4" />
              <span>Co-Parent / Partner</span>
            </div>

            <div>
              <label className="text-xs text-stone-300 block mb-1">Partner's Name</label>
              <input
                type="text"
                required
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="e.g. Jordan"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-stone-300 block mb-1">Partner Work Schedule</label>
              <select
                value={partnerWork}
                onChange={(e) => setPartnerWork(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="full_time">Full-Time Employment</option>
                <option value="parental_leave">Parental Leave</option>
                <option value="part_time">Part-Time Employment</option>
                <option value="homemaker">Homemaker</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="pt-6">
        <button
          type="submit"
          className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-950/50"
        >
          <span>Continue to Simulation Setup</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
