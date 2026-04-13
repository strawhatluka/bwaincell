import type { NoteRow } from '../types';
interface NoteUpdateAttributes {
    title?: string;
    content?: string;
    tags?: string[];
}
declare class Note {
    static createNote(guildId: string, title: string, content: string, tags?: string[], userId?: string): Promise<NoteRow>;
    static getNotes(guildId: string): Promise<NoteRow[]>;
    static getNote(noteId: number, guildId: string): Promise<NoteRow | null>;
    static deleteNote(noteId: number, guildId: string): Promise<boolean>;
    static searchNotes(guildId: string, keyword: string): Promise<NoteRow[]>;
    static updateNote(noteId: number, guildId: string, updates: NoteUpdateAttributes): Promise<NoteRow | null>;
    static getNotesByTag(guildId: string, tag: string): Promise<NoteRow[]>;
    static getAllTags(guildId: string): Promise<string[]>;
}
export default Note;
//# sourceMappingURL=Note.d.ts.map