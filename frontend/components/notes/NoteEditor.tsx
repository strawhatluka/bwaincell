'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

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

interface NoteEditorProps {
  note?: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; content: string; tags: string[] }, noteId?: number) => void;
  isSaving: boolean;
}

export function NoteEditor({ note, isOpen, onClose, onSave, isSaving }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags || []);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
    }
  }, [note]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    // Check if user has uncommitted tag input
    if (tagInput.trim()) {
      alert(
        'Please press Enter or add a comma to add the tag, or clear the tag field before saving.'
      );
      return;
    }

    onSave(
      {
        title: title.trim(),
        content: content.trim(),
        tags,
      },
      note?.id
    );

    // Reset form
    setTitle('');
    setContent('');
    setTags([]);
    setTagInput('');
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setTags([]);
    setTagInput('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{note ? 'Edit Note' : 'Create New Note'}</DialogTitle>
            <DialogDescription>
              {note
                ? 'Update your note below.'
                : 'Write your thoughts, ideas, or important information.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title"
                disabled={isSaving}
                className="border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
                rows={10}
                disabled={isSaving}
                className="border-[#f59e0b]/30 focus-visible:ring-[#f59e0b] resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Press Enter or comma to add tags"
                disabled={isSaving}
                className="border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-[#f59e0b]/10 text-[#f59e0b] pr-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:bg-[#f59e0b]/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !title.trim() || !content.trim()}
              className="bg-[#f59e0b] hover:bg-[#e08c00]"
            >
              {isSaving ? 'Saving...' : note ? 'Update Note' : 'Create Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
