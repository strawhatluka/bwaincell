import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { ReminderCreateForm } from '@/components/reminders/ReminderCreateForm';

describe('ReminderCreateForm', () => {
  let onCreate: jest.Mock;

  beforeEach(() => {
    onCreate = jest.fn();
  });

  async function openDialog() {
    const user = userEvent.setup();
    render(<ReminderCreateForm onCreate={onCreate} isCreating={false} />);
    await user.click(screen.getByRole('button', { name: /Create Reminder/i }));
    return user;
  }

  it('renders trigger button', () => {
    render(<ReminderCreateForm onCreate={onCreate} isCreating={false} />);
    expect(screen.getByRole('button', { name: /Create Reminder/i })).toBeInTheDocument();
  });

  it('opens dialog with message and time inputs', async () => {
    await openDialog();
    expect(await screen.findByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByLabelText('Time')).toBeInTheDocument();
    // Radix Select renders a combobox button; the Type label exists in the DOM
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
  });

  it('does not show Day of Week by default (once)', async () => {
    await openDialog();
    await screen.findByLabelText('Message');
    expect(screen.queryByLabelText('Day of Week')).not.toBeInTheDocument();
  });

  it('shows Day of Week when frequency is weekly', async () => {
    await openDialog();
    await screen.findByLabelText('Message');
    // Radix Select mirrors value into a hidden native <select>; change it directly
    const hiddenSelects = document.querySelectorAll('select');
    expect(hiddenSelects.length).toBeGreaterThan(0);
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(hiddenSelects[0], { target: { value: 'weekly' } });
    expect(await screen.findByText('Day of Week')).toBeInTheDocument();
  });

  it('submits with message, frequency, time for once reminder', async () => {
    const user = await openDialog();
    await user.type(await screen.findByLabelText('Message'), 'Take meds');
    await user.click(screen.getByRole('button', { name: /^Create Reminder$/i }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Take meds',
        frequency: 'once',
        time: '09:00',
      })
    );
    // dayOfWeek should be undefined for once
    expect(onCreate.mock.calls[0][0].dayOfWeek).toBeUndefined();
  });

  it('includes dayOfWeek when frequency is weekly', async () => {
    const user = await openDialog();
    await user.type(await screen.findByLabelText('Message'), 'Weekly task');
    const hiddenSelects = document.querySelectorAll('select');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(hiddenSelects[0], { target: { value: 'weekly' } });
    await user.click(screen.getByRole('button', { name: /^Create Reminder$/i }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Weekly task',
        frequency: 'weekly',
        dayOfWeek: expect.any(Number),
      })
    );
  });

  it('disables submit when message is empty', async () => {
    await openDialog();
    await screen.findByLabelText('Message');
    expect(screen.getByRole('button', { name: /^Create Reminder$/i })).toBeDisabled();
  });

  it('shows "Creating..." when isCreating', async () => {
    const user = userEvent.setup();
    render(<ReminderCreateForm onCreate={onCreate} isCreating={true} />);
    await user.click(screen.getByRole('button', { name: /^Create Reminder$/i }));
    expect(await screen.findByRole('button', { name: /Creating\.\.\./i })).toBeInTheDocument();
  });

  it('cancel closes the dialog', async () => {
    const user = await openDialog();
    await screen.findByLabelText('Message');
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
  });
});
