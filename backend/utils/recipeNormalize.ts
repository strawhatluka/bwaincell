/**
 * @module recipeNormalize
 * @description Canonicalize recipe metadata fields (cuisine, difficulty,
 * dietary tags) to lowercase + trimmed strings so search matches and storage
 * stay consistent regardless of whether values came from JSON-LD, Gemini,
 * or hand-typed edits.
 */

import type { RecipeDifficulty } from '@database/types';

export function normalizeCuisine(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const trimmed = v.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeDifficulty(v: string | null | undefined): RecipeDifficulty | null {
  if (v === null || v === undefined) return null;
  const trimmed = v.trim().toLowerCase();
  if (trimmed === 'easy' || trimmed === 'medium' || trimmed === 'hard') {
    return trimmed;
  }
  return null;
}

export function normalizeDietaryTags(v: string[] | null | undefined): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of v) {
    if (typeof raw !== 'string') continue;
    const norm = raw.trim().toLowerCase();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}
