import type { ListRow } from '../types';
export interface ListItem {
  text: string;
  completed: boolean;
  added_at: Date;
}
declare class List {
  private static findListCaseInsensitive;
  static createList(guildId: string, name: string, userId?: string): Promise<ListRow | null>;
  static addItem(guildId: string, listName: string, item: string): Promise<ListRow | null>;
  static removeItem(guildId: string, listName: string, itemText: string): Promise<ListRow | null>;
  static getList(guildId: string, listName: string): Promise<ListRow | null>;
  static getUserLists(guildId: string): Promise<ListRow[]>;
  static clearCompleted(guildId: string, listName: string): Promise<ListRow | null>;
  static deleteList(guildId: string, listName: string): Promise<boolean>;
  static toggleItem(guildId: string, listName: string, itemText: string): Promise<ListRow | null>;
}
export default List;
//# sourceMappingURL=List.d.ts.map
