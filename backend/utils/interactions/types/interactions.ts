import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  CacheType,
  Collection,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';

// Database Model Interfaces
export interface TaskModel {
  id: number;
  description: string;
  due_date?: Date;
  completed: boolean;
  user_id: string;
  guild_id: string;
}

export interface ListModel {
  id: number;
  name: string;
  items: Array<{ text: string; completed: boolean }>;
  user_id: string;
  guild_id: string;
}

// Reminder interface
interface ReminderModel {
  id: number;
  message: string;
  time: string;
  frequency: string;
  day_of_week?: number | null;
  channel_id: string;
  user_id: string;
  guild_id: string;
  active: boolean;
  next_trigger?: Date | null;
}

// Database Operations Interfaces
export interface TaskOperations {
  getUserTasks(guildId: string, status?: string): Promise<TaskModel[]>;
  completeTask(taskId: number, guildId: string): Promise<TaskModel | null>;
  createTask(
    guildId: string,
    description: string,
    dueDate?: Date | null,
    userId?: string
  ): Promise<TaskModel>;
  editTask(
    taskId: number,
    guildId: string,
    description: string,
    newDueDate?: Date | null
  ): Promise<TaskModel | null>;
  deleteTask(taskId: number, guildId: string): Promise<boolean>;
}

export interface ListOperations {
  createList(guildId: string, name: string, userId?: string): Promise<ListModel | null>;
  addItem(guildId: string, listName: string, item: string): Promise<ListModel | null>;
  removeItem(guildId: string, listName: string, itemText: string): Promise<ListModel | null>;
  getList(guildId: string, listName: string): Promise<ListModel | null>;
  getUserLists(guildId: string): Promise<ListModel[]>;
  clearCompleted(guildId: string, listName: string): Promise<ListModel | null>;
  deleteList(guildId: string, listName: string): Promise<boolean>;
  toggleItem(guildId: string, listName: string, itemText: string): Promise<ListModel | null>;
}

export interface ReminderOperations {
  deleteReminder(reminderId: number, guildId: string): Promise<boolean>;
  createReminder(
    guildId: string,
    channelId: string,
    message: string,
    time: string,
    frequency: string,
    dayOfWeek?: number | null,
    userId?: string
  ): Promise<ReminderModel>;
  getUserReminders(guildId: string): Promise<ReminderModel[]>;
}

export interface DatabaseModels {
  Task: TaskOperations;
  List: ListOperations;
  Reminder: ReminderOperations;
}

// Command Interface
export interface CommandWithExecute {
  data: {
    name: string;
    description: string;
    // Discord.js SlashCommandBuilder properties
    [key: string]: unknown;
  };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

// Handler Types
export type ButtonHandler = (interaction: ButtonInteraction<CacheType>) => Promise<void>;
export type SelectMenuHandler = (
  interaction: StringSelectMenuInteraction<CacheType>
) => Promise<void>;
export type ModalHandler = (interaction: ModalSubmitInteraction<CacheType>) => Promise<void>;

// Extend Discord.js Client
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, CommandWithExecute>;
  }
}
