/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Optional, Sequelize } from 'sequelize';
import schemas from '../schema';

// Define interface for list items
export interface ListItem {
  text: string;
  completed: boolean;
  added_at: Date;
}

// Define attributes interface matching the schema
interface ListAttributes {
  id: number;
  name: string;
  items: ListItem[];
  user_id: string;
  guild_id: string;
  created_at: Date;
}

// Creation attributes (id and created_at are optional during creation)
interface ListCreationAttributes extends Optional<ListAttributes, 'id' | 'created_at' | 'items'> {}

const ListBase = Model as any;
class List extends ListBase<ListAttributes, ListCreationAttributes> implements ListAttributes {
  //     public id!: number;
  //     public name!: string;
  //     public items!: ListItem[];
  //     public user_id!: string;
  //     public guild_id!: string;
  //     public created_at!: Date;

  static init(sequelize: Sequelize) {
    return Model.init.call(this as any, schemas.list, {
      sequelize,
      modelName: 'List',
      tableName: 'lists',
      timestamps: false,
    });
  }

  // Helper method to find list case-insensitively
  // NOTE: Filters by guild_id only for shared household access (WO-015)
  private static async findListCaseInsensitive(
    guildId: string,
    listName: string
  ): Promise<any | null> {
    const lists = await (this as any).findAll({
      where: { guild_id: guildId },
    });

    return (
      lists.find(
        (l: InstanceType<typeof List>) => l.name.toLowerCase() === listName.toLowerCase()
      ) || null
    );
  }

  static async createList(guildId: string, name: string, userId?: string): Promise<List | null> {
    const existing = await this.findListCaseInsensitive(guildId, name);

    if (existing) return null;

    return await (this as any).create({
      user_id: userId || 'system', // Keep for audit trail
      guild_id: guildId,
      name,
      items: [],
    });
  }

  static async addItem(guildId: string, listName: string, item: string): Promise<List | null> {
    const list = await this.findListCaseInsensitive(guildId, listName);

    if (!list) return null;

    const items = list.items || [];
    items.push({
      text: item,
      completed: false,
      added_at: new Date(),
    });

    list.items = items;
    list.changed('items', true); // Mark items as changed for Sequelize
    await list.save();

    return list;
  }

  static async removeItem(
    guildId: string,
    listName: string,
    itemText: string
  ): Promise<List | null> {
    const list = await this.findListCaseInsensitive(guildId, listName);

    if (!list) return null;

    const items = list.items || [];
    const index = items.findIndex(
      (item: ListItem) => item.text.toLowerCase() === itemText.toLowerCase()
    );

    if (index === -1) return null;

    items.splice(index, 1);
    list.items = items;
    list.changed('items', true); // Mark items as changed for Sequelize
    await list.save();

    return list;
  }

  static async getList(guildId: string, listName: string): Promise<List | null> {
    return await this.findListCaseInsensitive(guildId, listName);
  }

  static async getUserLists(guildId: string): Promise<List[]> {
    const where = { guild_id: guildId };
    return await (this as any).findAll({ where, order: [['created_at', 'DESC']] });
  }

  static async clearCompleted(guildId: string, listName: string): Promise<List | null> {
    const list = await this.findListCaseInsensitive(guildId, listName);

    if (!list) return null;

    const items = list.items || [];
    list.items = items.filter((item: ListItem) => !item.completed);
    list.changed('items', true); // Mark items as changed for Sequelize
    await list.save();

    return list;
  }

  static async deleteList(guildId: string, listName: string): Promise<boolean> {
    const targetList = await this.findListCaseInsensitive(guildId, listName);

    if (!targetList) return false;

    const result = await (this as any).destroy({
      where: { id: targetList.id },
    });

    return result > 0;
  }

  static async toggleItem(
    guildId: string,
    listName: string,
    itemText: string
  ): Promise<List | null> {
    const list = await this.findListCaseInsensitive(guildId, listName);

    if (!list) return null;

    const items = list.items || [];
    const item = items.find((item: ListItem) => item.text.toLowerCase() === itemText.toLowerCase());

    if (!item) return null;

    item.completed = !item.completed;
    list.items = items;
    list.changed('items', true); // Mark items as changed for Sequelize
    await list.save();

    return list;
  }
}

export default List;
