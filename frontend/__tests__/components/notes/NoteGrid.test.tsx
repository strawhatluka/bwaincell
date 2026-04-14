import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { NoteGrid } from '@/components/notes/NoteGrid';
import { useNotes } from '@/hooks/useNotes';

jest.mock('@/hooks/useNotes', () => ({
  useNotes: jest.fn(),
}));

const mockUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;

function makeHookReturn(overrides: Partial<ReturnType<typeof useNotes>> = {}) {
  return {
    notes: [],
    isLoading: false,
    error: null,
    createNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    ...overrides,
  } as unknown as ReturnType<typeof useNotes>;
}

const sampleNotes = [
  {
    id: 1,
    userId: 'u',
    guildId: 'g',
    title: 'Alpha Note',
    content: 'alpha content',
    tags: ['x'],
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 2,
    userId: 'u',
    guildId: 'g',
    title: 'Beta Note',
    content: 'beta content',
    tags: [],
    createdAt: '2026-01-16T10:00:00.000Z',
    updatedAt: '2026-01-16T10:00:00.000Z',
  },
];

describe('NoteGrid', () => {
  beforeEach(() => {
    mockUseNotes.mockReset();
  });

  it('renders notes returned from useNotes', () => {
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: sampleNotes }));
    render(<NoteGrid />);
    expect(screen.getByText('Alpha Note')).toBeInTheDocument();
    expect(screen.getByText('Beta Note')).toBeInTheDocument();
  });

  it('renders empty state when no notes', () => {
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: [] }));
    render(<NoteGrid />);
    expect(screen.getByText(/No notes yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Your First Note/i })).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    mockUseNotes.mockReturnValue(makeHookReturn({ isLoading: true }));
    const { container } = render(<NoteGrid />);
    // Skeleton rendered; search input should not appear when loading
    expect(screen.queryByPlaceholderText(/Search notes/i)).not.toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  it('renders search input', () => {
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: sampleNotes }));
    render(<NoteGrid />);
    expect(screen.getByPlaceholderText(/Search notes/i)).toBeInTheDocument();
  });

  it('passes search term to useNotes when search submitted', () => {
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: sampleNotes }));
    render(<NoteGrid />);
    const input = screen.getByPlaceholderText(/Search notes/i);
    fireEvent.change(input, { target: { value: 'alpha' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    // useNotes should have been invoked with 'alpha' as the active search
    const lastCall = mockUseNotes.mock.calls[mockUseNotes.mock.calls.length - 1];
    expect(lastCall[0]).toBe('alpha');
  });

  it('clears active search when input is emptied', () => {
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: sampleNotes }));
    render(<NoteGrid />);
    const input = screen.getByPlaceholderText(/Search notes/i);
    fireEvent.change(input, { target: { value: 'alpha' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    fireEvent.change(input, { target: { value: '' } });
    const lastCall = mockUseNotes.mock.calls[mockUseNotes.mock.calls.length - 1];
    expect(lastCall[0]).toBe('');
  });

  it('opens NoteEditor in create mode when Create Note button clicked', () => {
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: sampleNotes }));
    render(<NoteGrid />);
    fireEvent.click(screen.getByRole('button', { name: /Create Note/i }));
    expect(screen.getByText(/Create New Note/i)).toBeInTheDocument();
  });

  it('opens NoteEditor in create mode from empty state button', () => {
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: [] }));
    render(<NoteGrid />);
    fireEvent.click(screen.getByRole('button', { name: /Create Your First Note/i }));
    expect(screen.getByText(/Create New Note/i)).toBeInTheDocument();
  });

  it('opens NoteEditor in edit mode when a note card is clicked → Edit', () => {
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: sampleNotes }));
    render(<NoteGrid />);
    // Click the note card to open view dialog
    fireEvent.click(screen.getByText('Alpha Note'));
    // Click Edit button in view dialog
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
    expect(screen.getByText(/Edit Note/i)).toBeInTheDocument();
  });

  it('calls createNote when saving a new note', () => {
    const createNote = jest.fn();
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: sampleNotes, createNote }));
    render(<NoteGrid />);
    fireEvent.click(screen.getByRole('button', { name: /Create Note/i }));
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Hello' } });
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: 'World' } });
    fireEvent.click(screen.getByRole('button', { name: /^Create Note$/i }));
    expect(createNote).toHaveBeenCalledWith({
      title: 'Hello',
      content: 'World',
      tags: [],
    });
  });

  it('calls deleteNote when delete confirmed from card', () => {
    const deleteNote = jest.fn();
    mockUseNotes.mockReturnValue(makeHookReturn({ notes: sampleNotes, deleteNote }));
    render(<NoteGrid />);
    fireEvent.click(screen.getByText('Alpha Note'));
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(deleteNote).toHaveBeenCalledWith(1);
  });
});
