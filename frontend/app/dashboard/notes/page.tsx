'use client';

import { NoteGrid } from '@/components/notes/NoteGrid';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function NotesPage() {
  return (
    <ErrorBoundary>
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Notes</h1>
          <p className="text-muted-foreground mt-1">Capture your thoughts and ideas</p>
        </div>
        <NoteGrid />
      </div>
    </ErrorBoundary>
  );
}
