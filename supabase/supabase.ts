import { createClient, SupabaseClient } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Logger is optional — supabase/ is outside the backend rootDir
let logger: any;
try {
  const { createLogger } = require('../backend/shared/utils/logger');
  logger = createLogger('Database');
} catch {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

let cachedClient: SupabaseClient | null = null;

/**
 * Lazy-initialize the Supabase client on first access.
 * Throws if env vars are missing at the time of the first call (not at import).
 * This prevents build-time failures in Next.js when env vars aren't present
 * during `next build` page data collection.
 */
function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables are required'
    );
  }

  logger.info('Initializing Supabase connection', {
    supabaseUrl,
    nodeEnv: process.env.NODE_ENV,
  });

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  });

  return cachedClient;
}

/**
 * Proxy that forwards all operations to the lazily-initialized client.
 * This means `import supabase from './supabase'` can be used at the top of
 * module files without triggering client creation until the first query.
 */
const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * Verify the Supabase connection is working.
 * Used during bot startup to ensure database is reachable.
 */
export async function verifyConnection(): Promise<void> {
  try {
    const { error } = await supabase.from('tasks').select('id').limit(1);
    if (error) throw error;
    logger.info('Supabase connection verified');
  } catch (error) {
    logger.error('Supabase connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export { supabase };
export default supabase;
