/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Optional, Sequelize, Op } from 'sequelize';
import schemas from '../schema';

// Define attributes interface matching the schema
interface NoteAttributes {
  id: number;
  title: string;
  content: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  user_id: string;
  guild_id: string;
}

// Creation attributes (id and timestamps are optional during creation)
interface NoteCreationAttributes
  extends Optional<NoteAttributes, 'id' | 'created_at' | 'updated_at' | 'tags'> {}

// Update attributes interface
interface NoteUpdateAttributes {
  title?: string;
  content?: string;
  tags?: string[];
}

const NoteBase = Model as any;
class Note extends NoteBase<NoteAttributes, NoteCreationAttributes> implements NoteAttributes {
  // Sequelize automatically provides getters/setters for these fields
  // Commenting out to prevent shadowing warnings
  // public id!: number;
  // public title!: string;
  // public content!: string;
  // public tags!: string[];
  // public created_at!: Date;
  // public updated_at!: Date;
  // public user_id!: string;
  // public guild_id!: string;

  static init(sequelize: Sequelize) {
    return Model.init.call(this as any, schemas.note, {
      sequelize,
      modelName: 'Note',
      tableName: 'notes',
      timestamps: false,
    });
  }

  static async createNote(
    guildId: string,
    title: string,
    content: string,
    tags: string[] = [],
    userId?: string
  ): Promise<Note> {
    return await (this as any).create({
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      title,
      content,
      tags,
    });
  }

  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getNotes(guildId: string): Promise<Note[]> {
    return await (this as any).findAll({
      where: { guild_id: guildId },
      order: [['created_at', 'DESC']],
    });
  }

  static async getNote(noteId: number, guildId: string): Promise<Note | null> {
    return await (this as any).findOne({
      where: { id: noteId, guild_id: guildId },
    });
  }

  static async deleteNote(noteId: number, guildId: string): Promise<boolean> {
    const result = await (this as any).destroy({
      where: { id: noteId, guild_id: guildId },
    });

    return result > 0;
  }

  static async searchNotes(guildId: string, keyword: string): Promise<Note[]> {
    return await (this as any).findAll({
      where: {
        guild_id: guildId,
        [Op.or]: [
          { title: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } },
        ],
      },
      order: [['created_at', 'DESC']],
    });
  }

  static async updateNote(
    noteId: number,
    guildId: string,
    updates: NoteUpdateAttributes
  ): Promise<Note | null> {
    const note = await (this as any).findOne({
      where: { id: noteId, guild_id: guildId },
    });

    if (!note) return null;

    if (updates.title) note.title = updates.title;
    if (updates.content) note.content = updates.content;
    if (updates.tags) note.tags = updates.tags;

    note.updated_at = new Date();
    await note.save();

    return note;
  }

  static async getNotesByTag(guildId: string, tag: string): Promise<Note[]> {
    const notes = await (this as any).findAll({
      where: { guild_id: guildId },
    });

    return notes.filter((note: InstanceType<typeof Note>) => {
      const tags = note.tags || [];
      return tags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
    });
  }

  static async getAllTags(guildId: string): Promise<string[]> {
    const notes = await (this as any).findAll({
      where: { guild_id: guildId },
      attributes: ['tags'],
    });

    const allTags = new Set<string>();
    notes.forEach((note: InstanceType<typeof Note>) => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tag: string) => allTags.add(tag));
      }
    });

    return Array.from(allTags);
  }
}

export default Note;
