/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface EducationalCardProps {
  title: string;
  summary: string;
  content: string;
  badge?: string;
}

export const EducationalCard: React.FC<EducationalCardProps> = ({
  title,
  summary,
  content,
  badge = "Pediatric Simulation Science"
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="rounded-2xl bg-stone-900/80 border border-stone-800 p-4 transition-all hover:border-stone-700">
      <div className="flex items-start justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="space-y-1 pr-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-medium">
              {badge}
            </span>
          </div>
          <h4 className="text-xs font-semibold text-stone-200 mt-1">{title}</h4>
          <p className="text-[11px] text-stone-400 leading-relaxed">{summary}</p>
        </div>
        <button className="text-stone-400 p-1 hover:text-stone-200">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-stone-800/60 text-xs text-stone-300 leading-relaxed space-y-2 animate-in fade-in duration-200">
          <p>{content}</p>
          <div className="p-2.5 rounded-xl bg-stone-950/60 border border-stone-800 text-[10px] text-stone-400 flex items-start space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
            <span>AI-generated educational content for simulation purposes only, not verified medical advice. Real parenting and clinical health questions should always be directed to a qualified pediatrician or healthcare provider.</span>
          </div>
        </div>
      )}
    </div>
  );
};
