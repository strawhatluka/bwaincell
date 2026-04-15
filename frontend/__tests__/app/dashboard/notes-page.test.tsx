import { render, screen } from '@/__tests__/test-utils';
import NotesPage from '@/app/dashboard/notes/page';

jest.mock('@/components/notes/NoteGrid', () => ({
  NoteGrid: () => <div data-testid="note-grid" />,
}));

describe('NotesPage', () => {
  it('renders the notes heading and NoteGrid', () => {
    render(<NotesPage />);
    expect(screen.getByRole('heading', { name: /notes/i })).toBeInTheDocument();
    expect(screen.getByText(/capture your thoughts and ideas/i)).toBeInTheDocument();
    expect(screen.getByTestId('note-grid')).toBeInTheDocument();
  });
});
