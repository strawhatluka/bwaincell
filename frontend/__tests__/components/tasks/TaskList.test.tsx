import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { TaskList } from '@/components/tasks/TaskList';
import { useTasks } from '@/hooks/useTasks';

jest.mock('@/hooks/useTasks');

const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

function makeTask(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 'user-1',
    guildId: 'guild-1',
    description: 'Task 1',
    dueDate: null,
    completed: false,
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
    ...overrides,
  };
}

function setupHook(overrides: Partial<ReturnType<typeof useTasks>> = {}) {
  const defaults = {
    tasks: [],
    isLoading: false,
    error: null,
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  };
  mockedUseTasks.mockReturnValue({ ...defaults, ...overrides } as any);
  return { ...defaults, ...overrides };
}

describe('TaskList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no tasks', () => {
    setupHook({ tasks: [] });
    render(<TaskList />);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText(/Create your first task/i)).toBeInTheDocument();
  });

  it('renders tasks from useTasks hook', () => {
    setupHook({
      tasks: [
        makeTask({ id: 1, description: 'First task' }),
        makeTask({ id: 2, description: 'Second task' }),
      ] as any,
    });
    render(<TaskList />);
    expect(screen.getByText('First task')).toBeInTheDocument();
    expect(screen.getByText('Second task')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading', () => {
    const { container } = (() => {
      setupHook({ isLoading: true });
      return render(<TaskList />);
    })();
    // TaskListSkeleton renders animate-pulse elements
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows correct task counts in filter buttons', () => {
    setupHook({
      tasks: [
        makeTask({ id: 1, completed: false }),
        makeTask({ id: 2, completed: true }),
        makeTask({ id: 3, completed: false }),
      ] as any,
    });
    render(<TaskList />);
    expect(screen.getByRole('button', { name: /All \(3\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completed \(1\)/ })).toBeInTheDocument();
  });

  it('filters to pending tasks only when Pending clicked', async () => {
    const user = userEvent.setup();
    setupHook({
      tasks: [
        makeTask({ id: 1, description: 'Pending A', completed: false }),
        makeTask({ id: 2, description: 'Done B', completed: true }),
      ] as any,
    });
    render(<TaskList />);
    await user.click(screen.getByRole('button', { name: /Pending \(1\)/ }));
    expect(screen.getByText('Pending A')).toBeInTheDocument();
    expect(screen.queryByText('Done B')).not.toBeInTheDocument();
  });

  it('filters to completed tasks only when Completed clicked', async () => {
    const user = userEvent.setup();
    setupHook({
      tasks: [
        makeTask({ id: 1, description: 'Pending A', completed: false }),
        makeTask({ id: 2, description: 'Done B', completed: true }),
      ] as any,
    });
    render(<TaskList />);
    await user.click(screen.getByRole('button', { name: /Completed \(1\)/ }));
    expect(screen.getByText('Done B')).toBeInTheDocument();
    expect(screen.queryByText('Pending A')).not.toBeInTheDocument();
  });

  it('shows "No pending tasks" empty state in pending filter', async () => {
    const user = userEvent.setup();
    setupHook({
      tasks: [makeTask({ id: 1, completed: true })] as any,
    });
    render(<TaskList />);
    await user.click(screen.getByRole('button', { name: /Pending/ }));
    expect(screen.getByText('No pending tasks')).toBeInTheDocument();
  });

  it('shows "No completed tasks" empty state in completed filter', async () => {
    const user = userEvent.setup();
    setupHook({
      tasks: [makeTask({ id: 1, completed: false })] as any,
    });
    render(<TaskList />);
    await user.click(screen.getByRole('button', { name: /Completed/ }));
    expect(screen.getByText('No completed tasks')).toBeInTheDocument();
  });

  it('calls updateTask with id+data when child TaskItem updates', async () => {
    const updateTask = jest.fn();
    const user = userEvent.setup();
    setupHook({
      tasks: [makeTask({ id: 42, description: 'To toggle' })] as any,
      updateTask,
    });
    render(<TaskList />);
    await user.click(screen.getByRole('checkbox'));
    expect(updateTask).toHaveBeenCalledWith({ id: 42, data: { completed: true } });
  });

  it('renders TaskCreateForm at top', () => {
    setupHook({ tasks: [] });
    render(<TaskList />);
    expect(screen.getByLabelText('New Task')).toBeInTheDocument();
  });
});
