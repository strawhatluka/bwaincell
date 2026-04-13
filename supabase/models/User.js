'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.User = void 0;
const supabase_1 = __importDefault(require('../supabase'));
/**
 * User model class
 * Note: User table uses camelCase columns (googleId, discordId, guildId) unlike other tables.
 */
class User {
  static async findByGoogleId(googleId) {
    const { data, error } = await supabase_1.default
      .from('users')
      .select('*')
      .eq('googleId', googleId)
      .single();
    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }
  static async findByEmail(email) {
    const { data, error } = await supabase_1.default
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }
  static async create(userData) {
    const { data, error } = await supabase_1.default
      .from('users')
      .insert(userData)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  static async update(id, userData) {
    const { data, error } = await supabase_1.default
      .from('users')
      .update({ ...userData, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }
}
exports.User = User;
exports.default = User;
//# sourceMappingURL=User.js.map
