import { render, screen } from '@/__tests__/test-utils';
import RemindersPage from '@/app/dashboard/reminders/page';

jest.mock('@/components/reminders/ReminderList', () => ({
  ReminderList: () => <div data-testid="reminder-list" />,
}));

describe('RemindersPage', () => {
  it('renders the reminders heading and ReminderList', () => {
    render(<RemindersPage />);
    expect(screen.getByRole('heading', { name: /reminders/i })).toBeInTheDocument();
    expect(screen.getByText(/never forget important events/i)).toBeInTheDocument();
    expect(screen.getByTestId('reminder-list')).toBeInTheDocument();
  });
});
