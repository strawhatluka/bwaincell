/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Optional, Sequelize } from 'sequelize';
import schemas from '../schema';

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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation attributes (optional fields)
 */
interface UserCreationAttributes
  extends Optional<UserAttributes, 'id' | 'picture' | 'refreshToken' | 'createdAt' | 'updatedAt'> {}

/**
 * User model class
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UserBase = Model as any;
export class User
  extends UserBase<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public googleId!: string;
  public email!: string;
  public name!: string;
  public picture!: string | null;
  public discordId!: string;
  public guildId!: string;
  public refreshToken!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static init(sequelize: Sequelize) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Model.init.call(this as any, schemas.user, {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      underscored: true,
    });
  }
}

export default User;
