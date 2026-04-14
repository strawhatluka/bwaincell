import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

jest.mock('@/contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

const mockedUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockedUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('MobileNav', () => {
  let logout: jest.Mock;

  beforeEach(() => {
    logout = jest.fn();
    mockedUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      username: 'Bob',
      email: 'bob@example.com',
      logout,
    } as any);
    mockedUsePathname.mockReturnValue('/dashboard');
  });

  it('renders the menu trigger button', () => {
    render(<MobileNav />);
    expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
  });

  it('opens the drawer on trigger click and shows navigation links', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: /toggle menu/i }));

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Lists')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Reminders')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
  });

  it('displays the username inside the drawer', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: /toggle menu/i }));
    expect(await screen.findByText('Bob')).toBeInTheDocument();
  });

  it('shows the brand title inside the drawer', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: /toggle menu/i }));
    expect(await screen.findByText('Bwain.app')).toBeInTheDocument();
  });

  it('calls logout when log out button is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: /toggle menu/i }));
    const logoutBtn = await screen.findByRole('button', { name: /log out/i });
    await user.click(logoutBtn);

    expect(logout).toHaveBeenCalled();
  });

  it('closes the drawer after clicking a navigation link', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: /toggle menu/i }));
    const tasksLink = await screen.findByText('Tasks');
    await user.click(tasksLink);

    // After click, the drawer's navigation links should no longer be accessible
    await screen.findByRole('button', { name: /toggle menu/i });
    // Budget link is only rendered inside the open sheet
    expect(screen.queryByText('Budget')).not.toBeInTheDocument();
  });
});
