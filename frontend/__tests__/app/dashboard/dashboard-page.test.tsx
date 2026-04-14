import { render, screen } from '@/__tests__/test-utils';
import DashboardPage from '@/app/dashboard/page';

jest.mock('@/contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

const { useAuthContext } = require('@/contexts/AuthContext');

describe('DashboardPage', () => {
  it('renders welcome message with username', () => {
    useAuthContext.mockReturnValue({ username: 'Alice' });
    render(<DashboardPage />);
    expect(screen.getByText(/welcome back, alice/i)).toBeInTheDocument();
  });

  it('falls back to "User" when no username', () => {
    useAuthContext.mockReturnValue({ username: null });
    render(<DashboardPage />);
    expect(screen.getByText(/welcome back, user/i)).toBeInTheDocument();
  });
});
