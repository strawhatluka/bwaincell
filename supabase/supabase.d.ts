import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
declare const supabase: SupabaseClient<Database>;
/**
 * Verify the Supabase connection is working.
 * Used during bot startup to ensure database is reachable.
 */
export declare function verifyConnection(): Promise<void>;
export { supabase };
export default supabase;
//# sourceMappingURL=supabase.d.ts.map