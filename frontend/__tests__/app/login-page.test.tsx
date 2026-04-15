import { render, screen, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';

const mockSignIn = jest.fn();
const mockPush = jest.fn();

jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockPush.mockReset();
  });

  it('renders the Google sign-in button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByText(/bwain\.app/i)).toBeInTheDocument();
  });

  it('calls signIn and redirects on successful login', async () => {
    mockSignIn.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('google', {
        callbackUrl: '/dashboard',
        redirect: false,
      });
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows error message on signIn failure', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    mockSignIn.mockResolvedValue({ error: 'AccessDenied' });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument());
    spy.mockRestore();
  });

  it('shows error on unexpected exception', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    mockSignIn.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(screen.getByText(/unexpected error/i)).toBeInTheDocument());
    spy.mockRestore();
  });
});
