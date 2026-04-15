import supabase from '../supabase';
import type { UserRow, UserInsert, UserUpdate } from '../types';

/**
 * User attributes interface
 */
export interface UserAttributes {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture: string | null;
  discord_id: string;
  guild_id: string;
  refresh_token: string | null;
  created_at: string;
  updated_at: string;
}

export class User {
  static async findByGoogleId(googleId: string): Promise<UserRow | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
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
      .update({ ...userData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }
}

export default User;
