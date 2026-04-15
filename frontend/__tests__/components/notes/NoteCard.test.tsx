import React from 'react';
import { render, screen, fireEvent, within } from '../../test-utils';
import { NoteCard } from '@/components/notes/NoteCard';

const baseNote = {
  id: 1,
  userId: 'user-1',
  guildId: 'guild-1',
  title: 'Test Note',
  content: 'This is the content of the note.',
  tags: ['work', 'urgent'],
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-16T12:00:00.000Z',
};

describe('NoteCard', () => {
  it('renders title and content preview', () => {
    render(<NoteCard note={baseNote} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Test Note')).toBeInTheDocument();
    expect(screen.getByText('This is the content of the note.')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<NoteCard note={baseNote} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('renders formatted created date', () => {
    render(<NoteCard note={baseNote} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
  });

  it('renders with empty tags array', () => {
    const noteNoTags = { ...baseNote, tags: [] };
    render(<NoteCard note={noteNoTags} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Test Note')).toBeInTheDocument();
    expect(screen.queryByText('work')).not.toBeInTheDocument();
  });

  it('opens view dialog when card is clicked', () => {
    render(<NoteCard note={baseNote} onEdit={jest.fn()} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByText('Test Note'));
    // Dialog description shows "Created ..."
    expect(screen.getByText(/Created Jan 15, 2026/)).toBeInTheDocument();
  });

  it('calls onEdit when Edit button in view dialog is clicked', () => {
    const onEdit = jest.fn();
    render(<NoteCard note={baseNote} onEdit={onEdit} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByText('Test Note'));
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
    expect(onEdit).toHaveBeenCalledWith(baseNote);
  });

  it('opens delete confirmation when Delete clicked, then calls onDelete on confirm', () => {
    const onDelete = jest.fn();
    render(<NoteCard note={baseNote} onEdit={jest.fn()} onDelete={onDelete} />);
    // Open view dialog
    fireEvent.click(screen.getByText('Test Note'));
    // Click delete in view dialog
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    // Confirmation dialog should appear
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    // Confirm delete (destructive Delete button)
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
    // The destructive one is the last-rendered Delete button
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('does not call onDelete when user cancels delete confirmation', () => {
    const onDelete = jest.fn();
    render(<NoteCard note={baseNote} onEdit={jest.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Test Note'));
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('renders long content (truncation handled via CSS line-clamp)', () => {
    const longNote = {
      ...baseNote,
      content: 'a'.repeat(500),
    };
    render(<NoteCard note={longNote} onEdit={jest.fn()} onDelete={jest.fn()} />);
    const contentEl = screen.getByText('a'.repeat(500));
    expect(contentEl).toBeInTheDocument();
    expect(contentEl.className).toMatch(/line-clamp-3/);
  });

  it('handles note with undefined tags gracefully', () => {
    const noteUndefTags = { ...baseNote, tags: undefined as unknown as string[] };
    render(<NoteCard note={noteUndefTags} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('shows full content in view dialog', () => {
    render(<NoteCard note={baseNote} onEdit={jest.fn()} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByText('Test Note'));
    // Content appears both in card and dialog; verify dialog has it
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('This is the content of the note.')).toBeInTheDocument();
  });
});
