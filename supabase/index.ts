/* eslint-disable @typescript-eslint/no-explicit-any */
let logger: any;
try {
  const { createLogger } = require('../shared/utils/logger');
  logger = createLogger('Database');
} catch {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

// Import Supabase client
import { supabase, verifyConnection } from './supabase';

// Import all models
import Task from './models/Task';
import Note from './models/Note';
import Reminder from './models/Reminder';
import Budget from './models/Budget';
import Schedule from './models/Schedule';
import List from './models/List';
import { User } from './models/User';
import EventConfig from './models/EventConfig';
import SunsetConfig from './models/SunsetConfig';

logger.info('Database module loaded', {
  nodeEnv: process.env.NODE_ENV,
});

// Export Supabase client, models, and connection verifier
export {
  supabase,
  verifyConnection,
  Task,
  Note,
  Reminder,
  Budget,
  Schedule,
  List,
  User,
  EventConfig,
  SunsetConfig,
};

export default supabase;
