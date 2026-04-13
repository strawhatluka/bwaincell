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
export declare class User {
    static findByGoogleId(googleId: string): Promise<UserRow | null>;
    static findByEmail(email: string): Promise<UserRow | null>;
    static create(userData: UserInsert): Promise<UserRow>;
    static update(id: number, userData: UserUpdate): Promise<UserRow | null>;
}
export default User;
//# sourceMappingURL=User.d.ts.map