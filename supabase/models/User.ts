import supabase from '../supabase';
import type { UserRow, UserInsert, UserUpdate } from '../types';

/**
 * User attributes interface
 */
export interface UserAttributes {
  id: number;
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
  discordId: string;
  guildId: string;
  refreshToken: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * User model class
 * Note: User table uses camelCase columns (googleId, discordId, guildId) unlike other tables.
 */
export class User {
  static async findByGoogleId(googleId: string): Promise<UserRow | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('googleId', googleId)
      .single();

    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }

  static async findByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();

    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }

  static async create(userData: UserInsert): Promise<UserRow> {
    const { data, error } = await supabase.from('users').insert(userData).select().single();

    if (error) throw error;
    return data;
  }

  static async update(id: number, userData: UserUpdate): Promise<UserRow | null> {
    const { data, error } = await supabase
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

export default User;
