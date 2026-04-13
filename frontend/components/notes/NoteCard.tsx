'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = () => {
    onDelete(note.id);
    setIsDeleteOpen(false);
  };

  const handleEdit = () => {
    setIsViewOpen(false);
    onEdit(note);
  };

  return (
    <>
      <Card
        className="p-5 hover:shadow-lg transition-shadow cursor-pointer border-[#f59e0b]/20"
        onClick={() => setIsViewOpen(true)}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground line-clamp-1">{note.title}</h3>
          <FileText className="w-5 h-5 text-[#f59e0b] shrink-0 ml-2" />
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{note.content}</p>

        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {format(parseISO(note.createdAt), 'MMM d, yyyy')}
        </p>
      </Card>

      {/* View/Edit Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{note.title}</DialogTitle>
            <DialogDescription>
              Created {format(parseISO(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </DialogDescription>{' '}
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {note.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="bg-[#f59e0b]/10 text-[#f59e0b]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(true)}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleEdit} className="bg-[#f59e0b] hover:bg-[#e08c00]">
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{note.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
