import { render, screen } from '@/__tests__/test-utils';
import { ReminderList } from '@/components/reminders/ReminderList';
import { useReminders } from '@/hooks/useReminders';

jest.mock('@/hooks/useReminders');

const mockedUseReminders = useReminders as jest.MockedFunction<typeof useReminders>;

function makeReminder(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 'u1',
    guildId: 'g1',
    message: 'Drink water',
    frequency: 'daily' as 'once' | 'daily' | 'weekly',
    time: '09:00',
    nextTrigger: '2024-06-15T09:00:00.000Z',
    ...overrides,
  };
}

function setupHook(overrides: Partial<ReturnType<typeof useReminders>> = {}) {
  const defaults = {
    reminders: [],
    isLoading: false,
    error: null,
    deleteReminder: jest.fn(),
    isDeleting: false,
  };
  const merged = { ...defaults, ...overrides };
  mockedUseReminders.mockReturnValue(merged as any);
  return merged;
}

describe('ReminderList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeleton when isLoading', () => {
    setupHook({ isLoading: true });
    const { container } = render(<ReminderList />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state when no reminders', () => {
    setupHook({ reminders: [] });
    render(<ReminderList />);
    expect(screen.getByText('No reminders yet')).toBeInTheDocument();
  });

  it('mentions /remind command in empty state', () => {
    setupHook({ reminders: [] });
    render(<ReminderList />);
    expect(screen.getByText('/remind')).toBeInTheDocument();
  });

  it('renders reminders from useReminders hook', () => {
    setupHook({
      reminders: [
        makeReminder({ id: 1, message: 'First' }),
        makeReminder({ id: 2, message: 'Second' }),
      ] as any,
    });
    render(<ReminderList />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
