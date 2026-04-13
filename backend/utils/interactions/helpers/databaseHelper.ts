/* eslint-disable @typescript-eslint/no-explicit-any */
import { DatabaseModels } from '../types/interactions';
// Import models from database/index.ts
import { Task, List, Reminder } from '../../../../supabase';

let cachedModels: DatabaseModels | null = null;

export async function getModels(): Promise<DatabaseModels> {
  if (cachedModels) {
    return cachedModels;
  }

  // Return models from database/index.ts (Supabase-backed)
  cachedModels = { Task: Task as any, List: List as any, Reminder: Reminder as any };
  return cachedModels;
}
