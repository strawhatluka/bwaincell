'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.supabase = void 0;
exports.verifyConnection = verifyConnection;
const supabase_js_1 = require('@supabase/supabase-js');
const logger_1 = require('../shared/utils/logger');
const logger = (0, logger_1.createLogger)('Database');
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
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});
exports.supabase = supabase;
/**
 * Verify the Supabase connection is working.
 * Used during bot startup to ensure database is reachable.
 */
async function verifyConnection() {
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
exports.default = supabase;
//# sourceMappingURL=supabase.js.map
