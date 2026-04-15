import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { Header } from '@/components/layout/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useDarkMode } from '@/hooks/useDarkMode';
import { usePathname } from 'next/navigation';

jest.mock('@/contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: jest.fn(),
}));

jest.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: jest.fn(),
}));

const mockedUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockedUseInstallPrompt = useInstallPrompt as jest.MockedFunction<typeof useInstallPrompt>;
const mockedUseDarkMode = useDarkMode as jest.MockedFunction<typeof useDarkMode>;
const mockedUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('Header', () => {
  let logout: jest.Mock;
  let toggleDarkMode: jest.Mock;
  let promptInstall: jest.Mock;

  beforeEach(() => {
    logout = jest.fn();
    toggleDarkMode = jest.fn();
    promptInstall = jest.fn();

    mockedUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      username: 'Alice',
      email: 'alice@example.com',
      logout,
    } as any);

    mockedUseInstallPrompt.mockReturnValue({
      isInstallable: false,
      promptInstall,
    });

    mockedUseDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode,
    } as any);

    mockedUsePathname.mockReturnValue('/dashboard');
  });

  it('renders page title based on current pathname', () => {
    mockedUsePathname.mockReturnValue('/dashboard/tasks');
    render(<Header />);
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('falls back to Dashboard title for unknown pathname', () => {
    mockedUsePathname.mockReturnValue('/dashboard/unknown');
    render(<Header />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders avatar fallback with first letter of username', () => {
    render(<Header />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders install app button when installable', () => {
    mockedUseInstallPrompt.mockReturnValue({
      isInstallable: true,
      promptInstall,
    });
    render(<Header />);
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
  });

  it('does not render install button when not installable', () => {
    render(<Header />);
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
  });

  it('opens dropdown and triggers dark mode toggle', async () => {
    const user = userEvent.setup();
    render(<Header />);

    // Avatar/dropdown trigger is the last button rendered
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);

    const darkModeItem = await screen.findByText(/dark mode/i);
    await user.click(darkModeItem);
    expect(toggleDarkMode).toHaveBeenCalled();
  });

  it('opens logout confirm dialog when log out menu clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);

    const logoutItem = await screen.findByText('Log out');
    await user.click(logoutItem);

    // Confirm dialog appears
    expect(await screen.findByText('Are you sure you want to log out?')).toBeInTheDocument();
  });

  it('calls logout when confirmed from dialog', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);

    const logoutItem = await screen.findByText('Log out');
    await user.click(logoutItem);

    const confirmBtn = await screen.findByRole('button', { name: 'Log Out' });
    await user.click(confirmBtn);

    expect(logout).toHaveBeenCalled();
  });
});
