import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { TaskItem } from '@/components/tasks/TaskItem';

describe('TaskItem', () => {
  const baseTask = {
    id: 1,
    userId: 'user-1',
    guildId: 'guild-1',
    description: 'Test task',
    dueDate: null as string | null,
    completed: false,
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  };

  let onUpdate: jest.Mock;
  let onDelete: jest.Mock;

  beforeEach(() => {
    onUpdate = jest.fn();
    onDelete = jest.fn();
  });

  it('renders task description', () => {
    render(<TaskItem task={baseTask} onUpdate={onUpdate} onDelete={onDelete} />);
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });

  it('renders due date when present', () => {
    const task = { ...baseTask, dueDate: '2024-06-15T14:30:00.000Z' };
    render(<TaskItem task={task} onUpdate={onUpdate} onDelete={onDelete} />);
    // Date is rendered (format may vary by locale timezone, just check something date-like)
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('does not render due date section when dueDate is null', () => {
    render(<TaskItem task={baseTask} onUpdate={onUpdate} onDelete={onDelete} />);
    expect(screen.queryByText(/2024/)).not.toBeInTheDocument();
  });

  it('renders completed task with line-through styling', () => {
    const task = { ...baseTask, completed: true };
    render(<TaskItem task={task} onUpdate={onUpdate} onDelete={onDelete} />);
    const description = screen.getByText('Test task');
    expect(description.className).toContain('line-through');
  });

  it('renders uncompleted task without line-through', () => {
    render(<TaskItem task={baseTask} onUpdate={onUpdate} onDelete={onDelete} />);
    const description = screen.getByText('Test task');
    expect(description.className).not.toContain('line-through');
  });

  it('checkbox reflects completed state', () => {
    const task = { ...baseTask, completed: true };
    render(<TaskItem task={task} onUpdate={onUpdate} onDelete={onDelete} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('calls onUpdate with toggled completed when checkbox clicked', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} onUpdate={onUpdate} onDelete={onDelete} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onUpdate).toHaveBeenCalledWith(1, { completed: true });
  });

  it('toggles completed to false on already-completed task', async () => {
    const user = userEvent.setup();
    const task = { ...baseTask, completed: true };
    render(<TaskItem task={task} onUpdate={onUpdate} onDelete={onDelete} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onUpdate).toHaveBeenCalledWith(1, { completed: false });
  });

  it('opens delete confirmation dialog and calls onDelete on confirm', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} onUpdate={onUpdate} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button');
    // second action button is delete (edit first, then delete)
    await user.click(buttons[1]);
    expect(await screen.findByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('cancels delete dialog without calling onDelete', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} onUpdate={onUpdate} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);
    expect(await screen.findByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('opens edit dialog when edit button clicked', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} onUpdate={onUpdate} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(await screen.findByText('Edit Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveValue('Test task');
  });

  it('calls onUpdate with new description when edit saved', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={baseTask} onUpdate={onUpdate} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    const input = await screen.findByLabelText('Description');
    await user.clear(input);
    await user.type(input, 'Updated task');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(onUpdate).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ description: 'Updated task' })
    );
  });
});
