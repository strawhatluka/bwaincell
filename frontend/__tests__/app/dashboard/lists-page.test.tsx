import { render, screen } from '@/__tests__/test-utils';
import ListsPage from '@/app/dashboard/lists/page';

jest.mock('@/components/lists/ListGrid', () => ({
  ListGrid: () => <div data-testid="list-grid" />,
}));

describe('ListsPage', () => {
  it('renders the lists heading and ListGrid', () => {
    render(<ListsPage />);
    expect(screen.getByRole('heading', { name: /lists/i })).toBeInTheDocument();
    expect(screen.getByText(/create and manage your custom lists/i)).toBeInTheDocument();
    expect(screen.getByTestId('list-grid')).toBeInTheDocument();
  });
});
