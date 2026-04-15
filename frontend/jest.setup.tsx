import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/dashboard'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  redirect: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: { name: 'Test User', email: 'test@example.com', image: null },
      expires: '2099-01-01T00:00:00.000Z',
    },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Supabase models
jest.mock('@database/models/User', () => ({
  User: {
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@database/models/Task', () => ({
  __esModule: true,
  default: {
    createTask: jest.fn(),
    getUserTasks: jest.fn(),
    completeTask: jest.fn(),
    deleteTask: jest.fn(),
    editTask: jest.fn(),
  },
}));

jest.mock('@database/models/Note', () => ({
  __esModule: true,
  default: {
    createNote: jest.fn(),
    getNotes: jest.fn(),
    getNote: jest.fn(),
    deleteNote: jest.fn(),
    searchNotes: jest.fn(),
    updateNote: jest.fn(),
    getNotesByTag: jest.fn(),
    getAllTags: jest.fn(),
  },
}));

jest.mock('@database/models/List', () => ({
  __esModule: true,
  default: {
    createList: jest.fn(),
    getUserLists: jest.fn(),
    getList: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    clearCompleted: jest.fn(),
    deleteList: jest.fn(),
    toggleItem: jest.fn(),
  },
}));

jest.mock('@database/models/Reminder', () => ({
  __esModule: true,
  default: {
    createReminder: jest.fn(),
    getUserReminders: jest.fn(),
    deleteReminder: jest.fn(),
    getActiveReminders: jest.fn(),
    getTriggeredReminders: jest.fn(),
    updateNextTrigger: jest.fn(),
  },
}));

jest.mock('@database/models/Budget', () => ({
  __esModule: true,
  default: {
    addExpense: jest.fn(),
    addIncome: jest.fn(),
    getSummary: jest.fn(),
    getCategories: jest.fn(),
    getRecentEntries: jest.fn(),
    getMonthlyTrend: jest.fn(),
    deleteEntry: jest.fn(),
  },
}));

jest.mock('@database/models/Schedule', () => ({
  __esModule: true,
  default: {
    addEvent: jest.fn(),
    getEvents: jest.fn(),
    deleteEvent: jest.fn(),
    getCountdown: jest.fn(),
    getTodaysEvents: jest.fn(),
    getUpcomingEvents: jest.fn(),
  },
}));

jest.mock('@database/supabase', () => {
  const chain = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };
  return { __esModule: true, default: chain, supabase: chain };
});

// Suppress console.error for expected test errors
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('act(') ||
        args[0].includes('Not implemented'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});
