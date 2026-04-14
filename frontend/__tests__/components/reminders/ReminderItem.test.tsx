import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { ReminderItem } from '@/components/reminders/ReminderItem';

function makeReminder(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 'u1',
    guildId: 'g1',
    message: 'Drink water',
    frequency: 'once' as 'once' | 'daily' | 'weekly',
    time: '09:00',
    nextTrigger: '2024-06-15T09:00:00.000Z',
    ...overrides,
  };
}

describe('ReminderItem', () => {
  let onDelete: jest.Mock;

  beforeEach(() => {
    onDelete = jest.fn();
  });

  it('renders message', () => {
    render(<ReminderItem reminder={makeReminder({ message: 'Take pills' })} onDelete={onDelete} />);
    expect(screen.getByText('Take pills')).toBeInTheDocument();
  });

  it('shows "One-time" badge for once frequency', () => {
    render(<ReminderItem reminder={makeReminder({ frequency: 'once' })} onDelete={onDelete} />);
    expect(screen.getByText('One-time')).toBeInTheDocument();
  });

  it('shows "Daily" badge for daily frequency', () => {
    render(<ReminderItem reminder={makeReminder({ frequency: 'daily' })} onDelete={onDelete} />);
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  it('shows "Weekly (Monday)" for weekly with dayOfWeek=1', () => {
    render(
      <ReminderItem
        reminder={makeReminder({ frequency: 'weekly', dayOfWeek: 1 })}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText(/Weekly \(Monday\)/)).toBeInTheDocument();
  });

  it('formats next trigger date', () => {
    render(
      <ReminderItem
        reminder={makeReminder({ nextTrigger: '2024-06-15T09:00:00.000Z' })}
        onDelete={onDelete}
      />
    );
    // Format will vary by timezone but should contain 2024 and "Next:"
    expect(screen.getByText(/Next:/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('opens delete dialog and calls onDelete on confirm', async () => {
    const user = userEvent.setup();
    render(<ReminderItem reminder={makeReminder({ id: 42 })} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(await screen.findByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(onDelete).toHaveBeenCalledWith(42);
  });

  it('cancels delete dialog without calling onDelete', async () => {
    const user = userEvent.setup();
    render(<ReminderItem reminder={makeReminder({ id: 42 })} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(await screen.findByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
