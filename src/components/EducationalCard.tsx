/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { ContentItem, EDUCATION_BADGE } from '../content/copy';

interface EducationalCardProps {
  item: ContentItem;
}

const STATUS_LABEL: Record<ContentItem['status'], string> = {
  heuristic: 'Describes how the simulation works — not a claim about real babies.',
  general: 'General information, written cautiously. Not medical advice.',
  reviewed: 'Checked against the sources listed below. Still not medical advice.'
};

export const EducationalCard: React.FC<EducationalCardProps> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="rounded-2xl bg-stone-900/80 border border-stone-800 p-4 transition-all hover:border-stone-700">
      <div className="flex items-start justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="space-y-1 pr-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-medium">
            {EDUCATION_BADGE}
          </span>
          <h4 className="text-xs font-semibold text-stone-200 mt-1">{item.title}</h4>
          <p className="text-[11px] text-stone-400 leading-relaxed">{item.summary}</p>
        </div>
        <button className="text-stone-400 p-1 hover:text-stone-200" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-stone-800/60 text-xs text-stone-300 leading-relaxed space-y-2 animate-in fade-in duration-200">
          <p>{item.body}</p>
          <div className="p-2.5 rounded-xl bg-stone-950/60 border border-stone-800 text-[10px] text-stone-400 flex items-start space-x-1.5">
            <Info className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
            <span>{STATUS_LABEL[item.status]}</span>
          </div>
          {item.sources.length > 0 && (
            <ul className="text-[10px] text-stone-500 space-y-0.5">
              {item.sources.map(s => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-stone-300">{s.label}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
