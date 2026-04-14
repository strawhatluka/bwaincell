import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { ListCard } from '@/components/lists/ListCard';
import { useLists } from '@/hooks/useLists';

jest.mock('@/hooks/useLists');

const mockedUseLists = useLists as jest.MockedFunction<typeof useLists>;

function makeList(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 'u1',
    guildId: 'g1',
    name: 'Groceries',
    items: [] as Array<{ text: string; completed: boolean; added_at: string }>,
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

describe('ListCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list name', () => {
    setupHook();
    render(<ListCard list={makeList({ name: 'Shopping' })} />);
    expect(screen.getByText('Shopping')).toBeInTheDocument();
  });

  it('renders "No items yet" when list is empty', () => {
    setupHook();
    render(<ListCard list={makeList({ items: [] })} />);
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('renders items with checkboxes when present', () => {
    setupHook();
    const list = makeList({
      items: [
        { text: 'Milk', completed: false, added_at: '2024-01-01' },
        { text: 'Eggs', completed: true, added_at: '2024-01-02' },
      ],
    });
    render(<ListCard list={list} />);
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Eggs')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('shows item count', () => {
    setupHook();
    const list = makeList({
      items: [
        { text: 'a', completed: false, added_at: '2024-01-01' },
        { text: 'b', completed: false, added_at: '2024-01-02' },
      ],
    });
    render(<ListCard list={list} />);
    expect(screen.getByText(/2 items/)).toBeInTheDocument();
  });

  it('calls toggleItem when checkbox clicked', async () => {
    const toggleItem = jest.fn();
    setupHook({ toggleItem });
    const user = userEvent.setup();
    const list = makeList({
      name: 'MyList',
      items: [{ text: 'Task A', completed: false, added_at: '2024-01-01' }],
    });
    render(<ListCard list={list} />);
    await user.click(screen.getByRole('checkbox'));
    expect(toggleItem).toHaveBeenCalledWith({ listName: 'MyList', itemText: 'Task A' });
  });

  it('calls addItem when form submitted with text', async () => {
    const addItem = jest.fn();
    setupHook({ addItem });
    const user = userEvent.setup();
    render(<ListCard list={makeList({ name: 'MyList' })} />);
    const input = screen.getByPlaceholderText('Add item...');
    await user.type(input, 'New thing');
    const submitBtn = input.parentElement!.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    await user.click(submitBtn);
    expect(addItem).toHaveBeenCalledWith({ listName: 'MyList', item: 'New thing' });
  });

  it('does not call addItem when input is empty', async () => {
    const addItem = jest.fn();
    setupHook({ addItem });
    const user = userEvent.setup();
    render(<ListCard list={makeList({ name: 'MyList' })} />);
    const input = screen.getByPlaceholderText('Add item...');
    const submitBtn = input.parentElement!.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    await user.click(submitBtn);
    expect(addItem).not.toHaveBeenCalled();
  });

  it('opens delete confirmation dialog and calls deleteList on confirm', async () => {
    const deleteList = jest.fn();
    setupHook({ deleteList });
    const user = userEvent.setup();
    render(<ListCard list={makeList({ name: 'MyList' })} />);
    // First button is trash (delete) button
    const allButtons = screen.getAllByRole('button');
    await user.click(allButtons[0]);
    expect(await screen.findByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(deleteList).toHaveBeenCalledWith('MyList');
  });

  it('cancels delete dialog without calling deleteList', async () => {
    const deleteList = jest.fn();
    setupHook({ deleteList });
    const user = userEvent.setup();
    render(<ListCard list={makeList({ name: 'MyList' })} />);
    const allButtons = screen.getAllByRole('button');
    await user.click(allButtons[0]);
    expect(await screen.findByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(deleteList).not.toHaveBeenCalled();
  });

  it('shows "Clear completed" button when completed items exist', () => {
    setupHook();
    const list = makeList({
      items: [
        { text: 'a', completed: true, added_at: '2024-01-01' },
        { text: 'b', completed: false, added_at: '2024-01-02' },
      ],
    });
    render(<ListCard list={list} />);
    expect(screen.getByRole('button', { name: /Clear completed/i })).toBeInTheDocument();
    expect(screen.getByText(/\(1 completed\)/)).toBeInTheDocument();
  });

  it('calls clearCompleted when "Clear completed" clicked', async () => {
    const clearCompleted = jest.fn();
    setupHook({ clearCompleted });
    const user = userEvent.setup();
    const list = makeList({
      name: 'MyList',
      items: [{ text: 'a', completed: true, added_at: '2024-01-01' }],
    });
    render(<ListCard list={list} />);
    await user.click(screen.getByRole('button', { name: /Clear completed/i }));
    expect(clearCompleted).toHaveBeenCalledWith('MyList');
  });
});
