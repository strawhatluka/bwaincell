import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { NoteEditor } from '@/components/notes/NoteEditor';

const existingNote = {
  id: 7,
  userId: 'user-1',
  guildId: 'guild-1',
  title: 'Existing Title',
  content: 'Existing content',
  tags: ['alpha', 'beta'],
  createdAt: '2026-01-10T10:00:00.000Z',
  updatedAt: '2026-01-11T10:00:00.000Z',
};

describe('NoteEditor', () => {
  it('renders title input, content textarea, and tags input for new note', () => {
    render(
      <NoteEditor
        note={null}
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        isSaving={false}
      />
    );
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tags/i)).toBeInTheDocument();
    expect(screen.getByText(/Create New Note/i)).toBeInTheDocument();
  });

  it('shows empty fields for new note', () => {
    render(
      <NoteEditor
        note={null}
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        isSaving={false}
      />
    );
    expect((screen.getByLabelText(/Title/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/Content/i) as HTMLTextAreaElement).value).toBe('');
  });

  it('populates initial values when editing existing note', () => {
    render(
      <NoteEditor
        note={existingNote}
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        isSaving={false}
      />
    );
    expect((screen.getByLabelText(/Title/i) as HTMLInputElement).value).toBe('Existing Title');
    expect((screen.getByLabelText(/Content/i) as HTMLTextAreaElement).value).toBe(
      'Existing content'
    );
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
    expect(screen.getByText(/Edit Note/i)).toBeInTheDocument();
  });

  it('calls onSave with data and note id when submitting edit', () => {
    const onSave = jest.fn();
    render(
      <NoteEditor
        note={existingNote}
        isOpen={true}
        onClose={jest.fn()}
        onSave={onSave}
        isSaving={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Update Note/i }));
    expect(onSave).toHaveBeenCalledWith(
      { title: 'Existing Title', content: 'Existing content', tags: ['alpha', 'beta'] },
      7
    );
  });

  it('calls onSave with data and no id when creating new note', () => {
    const onSave = jest.fn();
    render(
      <NoteEditor note={null} isOpen={true} onClose={jest.fn()} onSave={onSave} isSaving={false} />
    );
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Title' } });
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: 'New body' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Note/i }));
    expect(onSave).toHaveBeenCalledWith(
      { title: 'New Title', content: 'New body', tags: [] },
      undefined
    );
  });

  it('disables submit when title or content is empty', () => {
    render(
      <NoteEditor
        note={null}
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        isSaving={false}
      />
    );
    const submitBtn = screen.getByRole('button', { name: /Create Note/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Only title' } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: 'Body here' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('does not call onSave when required fields are empty and form submitted programmatically', () => {
    const onSave = jest.fn();
    render(
      <NoteEditor note={null} isOpen={true} onClose={jest.fn()} onSave={onSave} isSaving={false} />
    );
    // Force empty submit via form
    const form = screen.getByLabelText(/Title/i).closest('form')!;
    fireEvent.submit(form);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('adds a tag when pressing Enter', () => {
    render(
      <NoteEditor
        note={null}
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        isSaving={false}
      />
    );
    const tagInput = screen.getByLabelText(/Tags/i) as HTMLInputElement;
    fireEvent.change(tagInput, { target: { value: 'newtag' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    expect(screen.getByText('newtag')).toBeInTheDocument();
    expect(tagInput.value).toBe('');
  });

  it('adds a tag when pressing comma', () => {
    render(
      <NoteEditor
        note={null}
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        isSaving={false}
      />
    );
    const tagInput = screen.getByLabelText(/Tags/i) as HTMLInputElement;
    fireEvent.change(tagInput, { target: { value: 'commatag' } });
    fireEvent.keyDown(tagInput, { key: ',' });
    expect(screen.getByText('commatag')).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = jest.fn();
    render(
      <NoteEditor note={null} isOpen={true} onClose={onClose} onSave={jest.fn()} isSaving={false} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Saving... state and disables submit when isSaving is true', () => {
    render(
      <NoteEditor
        note={existingNote}
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        isSaving={true}
      />
    );
    const submitBtn = screen.getByRole('button', { name: /Saving/i });
    expect(submitBtn).toBeDisabled();
  });
});
