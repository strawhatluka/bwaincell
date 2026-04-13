'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.SunsetConfig =
  exports.EventConfig =
  exports.User =
  exports.List =
  exports.Schedule =
  exports.Budget =
  exports.Reminder =
  exports.Note =
  exports.Task =
  exports.verifyConnection =
  exports.supabase =
    void 0;
const logger_1 = require('../shared/utils/logger');
const logger = (0, logger_1.createLogger)('Database');
// Import Supabase client
const supabase_1 = require('./supabase');
Object.defineProperty(exports, 'supabase', {
  enumerable: true,
  get: function () {
    return supabase_1.supabase;
  },
});
Object.defineProperty(exports, 'verifyConnection', {
  enumerable: true,
  get: function () {
    return supabase_1.verifyConnection;
  },
});
// Import all models
const Task_1 = __importDefault(require('./models/Task'));
exports.Task = Task_1.default;
const Note_1 = __importDefault(require('./models/Note'));
exports.Note = Note_1.default;
const Reminder_1 = __importDefault(require('./models/Reminder'));
exports.Reminder = Reminder_1.default;
const Budget_1 = __importDefault(require('./models/Budget'));
exports.Budget = Budget_1.default;
const Schedule_1 = __importDefault(require('./models/Schedule'));
exports.Schedule = Schedule_1.default;
const List_1 = __importDefault(require('./models/List'));
exports.List = List_1.default;
const User_1 = require('./models/User');
Object.defineProperty(exports, 'User', {
  enumerable: true,
  get: function () {
    return User_1.User;
  },
});
const EventConfig_1 = __importDefault(require('./models/EventConfig'));
exports.EventConfig = EventConfig_1.default;
const SunsetConfig_1 = __importDefault(require('./models/SunsetConfig'));
exports.SunsetConfig = SunsetConfig_1.default;
logger.info('Database module loaded', {
  nodeEnv: process.env.NODE_ENV,
});
exports.default = supabase_1.supabase;
//# sourceMappingURL=index.js.map
