/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimulationEvent } from '../types';
import { API_BASE } from './apiBase';

/**
 * TYPED AI SERVICE BOUNDARY
 * All calls to the language model go through here, so the provider/model can change
 * without touching the simulation or the screens. The server holds the API key.
 * Every function is safe to call with no key configured: the server returns a
 * factual fallback and `source` tells the UI which it got.
 */

export interface ExplainResult {
  insight: string;
  source: 'gemini' | 'offline_fallback' | 'error_fallback' | 'unavailable';
}

export async function explainEvent(event: SimulationEvent, question?: string): Promise<ExplainResult> {
  try {
    const res = await fetch(`${API_BASE}/api/gemini/explain-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: { type: event.type, title: event.title, description: event.description, time: new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        snapshot: event.snapshot || null,
        staticNote: event.educationalNote,
        question: question || 'Why did this happen?'
      })
    });
    if (!res.ok) return { insight: '', source: 'unavailable' };
    const data = await res.json();
    return { insight: typeof data.insight === 'string' ? data.insight : '', source: data.source || 'unavailable' };
  } catch {
    return { insight: '', source: 'unavailable' };
  }
}
