'use client';

import { useState, useEffect } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { NoteCard } from './NoteCard';
import { NoteEditor } from './NoteEditor';
import { NoteGridSkeleton } from './NoteSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, StickyNote, Search } from 'lucide-react';

interface Note {
  id: number;
  userId: string;
  guildId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function NoteGrid() {
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [wasSaving, setWasSaving] = useState(false);

  const { notes, isLoading, createNote, updateNote, deleteNote, isCreating, isUpdating } =
    useNotes(activeSearch);

  // Close dialog when save completes successfully
  useEffect(() => {
    const isSaving = isCreating || isUpdating;

    // If we were saving and now we're not, close the dialog
    if (wasSaving && !isSaving) {
      setIsEditorOpen(false);
      setEditingNote(null);
      setWasSaving(false);
    } else if (isSaving) {
      // Mark that we're currently saving
      setWasSaving(true);
    }
  }, [isCreating, isUpdating, wasSaving]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Clear search if input is empty
    if (value === '') {
      setActiveSearch('');
    }
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleSaveNote = (
    data: { title: string; content: string; tags: string[] },
    noteId?: number
  ) => {
    // Don't close dialog immediately - wait for mutation to complete
    // The dialog will close when isSaving becomes false
    if (noteId) {
      updateNote({ id: noteId, data });
    } else {
      createNote(data);
    }
  };

  if (isLoading) {
    return <NoteGridSkeleton />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search notes... (press Enter)"
            className="pl-10 border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
          />
        </form>
        <Button onClick={handleCreateNote} className="bg-[#f59e0b] hover:bg-[#e08c00]">
          <Plus className="w-4 h-4 mr-2" />
          Create Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <StickyNote className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            {activeSearch ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {activeSearch
              ? 'Try a different search term.'
              : 'Start writing down your thoughts and ideas!'}
          </p>
          {!activeSearch && (
            <Button onClick={handleCreateNote} className="bg-[#f59e0b] hover:bg-[#e08c00]">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Note
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={handleEditNote} onDelete={deleteNote} />
          ))}
        </div>
      )}

      <NoteEditor
        note={editingNote}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        isSaving={isCreating || isUpdating}
      />
    </div>
  );
}
