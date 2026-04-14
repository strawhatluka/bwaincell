import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { ListGrid } from '@/components/lists/ListGrid';
import { useLists } from '@/hooks/useLists';

jest.mock('@/hooks/useLists');

const mockedUseLists = useLists as jest.MockedFunction<typeof useLists>;

function makeList(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 'u1',
    guildId: 'g1',
    name: 'My List',
    items: [],
    createdAt: '2024-01-15T00:00:00.000Z',
    ...overrides,
  };
}

function setupHook(overrides: Partial<ReturnType<typeof useLists>> = {}) {
  const defaults = {
    lists: [],
    isLoading: false,
    error: null,
    createList: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    toggleItem: jest.fn(),
    clearCompleted: jest.fn(),
    deleteList: jest.fn(),
    isCreating: false,
    isAddingItem: false,
    isRemovingItem: false,
    isTogglingItem: false,
    isClearingCompleted: false,
    isDeleting: false,
  };
  const merged = { ...defaults, ...overrides };
  mockedUseLists.mockReturnValue(merged as any);
  return merged;
}

describe('ListGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeleton when isLoading', () => {
    setupHook({ isLoading: true });
    const { container } = render(<ListGrid />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state when no lists', () => {
    setupHook({ lists: [] });
    render(<ListGrid />);
    expect(screen.getByText('No lists yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Your First List/i })).toBeInTheDocument();
  });

  it('renders lists from useLists hook', () => {
    setupHook({
      lists: [makeList({ id: 1, name: 'Groceries' }), makeList({ id: 2, name: 'Books' })] as any,
    });
    render(<ListGrid />);
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
  });

  it('renders Create List button', () => {
    setupHook();
    render(<ListGrid />);
    expect(screen.getByRole('button', { name: /Create List/i })).toBeInTheDocument();
  });

  it('opens create dialog and calls createList with valid name', async () => {
    const createList = jest.fn();
    setupHook({ createList });
    const user = userEvent.setup();
    render(<ListGrid />);
    await user.click(screen.getByRole('button', { name: /^Create List$/i }));
    const input = await screen.findByLabelText(/List Name/i);
    await user.type(input, 'New List');
    await user.click(screen.getByRole('button', { name: /^Create List$/i }));
    expect(createList).toHaveBeenCalledWith({ name: 'New List' });
  });

  it('does not call createList when name is empty', async () => {
    const createList = jest.fn();
    setupHook({ createList });
    const user = userEvent.setup();
    render(<ListGrid />);
    await user.click(screen.getByRole('button', { name: /^Create List$/i }));
    await screen.findByLabelText(/List Name/i);
    const submitBtns = screen.getAllByRole('button', { name: /^Create List$/i });
    // submit button is disabled when empty
    const submit = submitBtns[submitBtns.length - 1];
    expect(submit).toBeDisabled();
    expect(createList).not.toHaveBeenCalled();
  });
});
