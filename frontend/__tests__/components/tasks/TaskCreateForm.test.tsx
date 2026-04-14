import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { TaskCreateForm } from '@/components/tasks/TaskCreateForm';

describe('TaskCreateForm', () => {
  it('renders input fields and submit button', () => {
    render(<TaskCreateForm onCreate={jest.fn()} isCreating={false} />);
    expect(screen.getByLabelText('New Task')).toBeInTheDocument();
    expect(screen.getByLabelText(/Due Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Due Time/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Task/i })).toBeInTheDocument();
  });

  it('disables submit button when description is empty', () => {
    render(<TaskCreateForm onCreate={jest.fn()} isCreating={false} />);
    expect(screen.getByRole('button', { name: /Add Task/i })).toBeDisabled();
  });

  it('enables submit button when description has content', async () => {
    const user = userEvent.setup();
    render(<TaskCreateForm onCreate={jest.fn()} isCreating={false} />);
    await user.type(screen.getByLabelText('New Task'), 'Buy milk');
    expect(screen.getByRole('button', { name: /Add Task/i })).toBeEnabled();
  });

  it('does not call onCreate when description is empty/whitespace', async () => {
    const onCreate = jest.fn();
    const user = userEvent.setup();
    render(<TaskCreateForm onCreate={onCreate} isCreating={false} />);
    // Form submit via Enter on empty input won't go through disabled button;
    // try whitespace, submit is still disabled.
    await user.type(screen.getByLabelText('New Task'), '   ');
    expect(screen.getByRole('button', { name: /Add Task/i })).toBeDisabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('calls onCreate with trimmed description when submitted', async () => {
    const onCreate = jest.fn();
    const user = userEvent.setup();
    render(<TaskCreateForm onCreate={onCreate} isCreating={false} />);
    await user.type(screen.getByLabelText('New Task'), '  Walk dog  ');
    await user.click(screen.getByRole('button', { name: /Add Task/i }));
    expect(onCreate).toHaveBeenCalledWith({ description: 'Walk dog', dueDate: undefined });
  });

  it('calls onCreate with dueDate when date provided', async () => {
    const onCreate = jest.fn();
    const user = userEvent.setup();
    render(<TaskCreateForm onCreate={onCreate} isCreating={false} />);
    await user.type(screen.getByLabelText('New Task'), 'Task with date');
    const dateInput = screen.getByLabelText(/Due Date/i) as HTMLInputElement;
    await user.type(dateInput, '2024-12-25');
    await user.click(screen.getByRole('button', { name: /Add Task/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    const arg = onCreate.mock.calls[0][0];
    expect(arg.description).toBe('Task with date');
    expect(typeof arg.dueDate).toBe('string');
    expect(arg.dueDate).toMatch(/2024-12-\d{2}T/);
  });

  it('combines date and time when both provided', async () => {
    const onCreate = jest.fn();
    const user = userEvent.setup();
    render(<TaskCreateForm onCreate={onCreate} isCreating={false} />);
    await user.type(screen.getByLabelText('New Task'), 'Task with time');
    await user.type(screen.getByLabelText(/Due Date/i), '2024-12-25');
    await user.type(screen.getByLabelText(/Due Time/i), '14:30');
    await user.click(screen.getByRole('button', { name: /Add Task/i }));
    const arg = onCreate.mock.calls[0][0];
    expect(arg.dueDate).toBeDefined();
    expect(typeof arg.dueDate).toBe('string');
  });

  it('clears form after successful submit', async () => {
    const user = userEvent.setup();
    render(<TaskCreateForm onCreate={jest.fn()} isCreating={false} />);
    const input = screen.getByLabelText('New Task') as HTMLInputElement;
    await user.type(input, 'Something');
    await user.click(screen.getByRole('button', { name: /Add Task/i }));
    expect(input.value).toBe('');
  });

  it('disables inputs and shows "Creating..." while isCreating', () => {
    render(<TaskCreateForm onCreate={jest.fn()} isCreating={true} />);
    expect(screen.getByLabelText('New Task')).toBeDisabled();
    expect(screen.getByLabelText(/Due Date/i)).toBeDisabled();
    expect(screen.getByLabelText(/Due Time/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Creating/i })).toBeDisabled();
  });

  it('updates description input value on typing', async () => {
    const user = userEvent.setup();
    render(<TaskCreateForm onCreate={jest.fn()} isCreating={false} />);
    const input = screen.getByLabelText('New Task') as HTMLInputElement;
    await user.type(input, 'Hello world');
    expect(input.value).toBe('Hello world');
  });
});
