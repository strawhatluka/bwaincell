import { render, screen } from '@/__tests__/test-utils';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

jest.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockedUseOnlineStatus = useOnlineStatus as jest.MockedFunction<typeof useOnlineStatus>;

describe('OfflineBanner', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when online', () => {
    mockedUseOnlineStatus.mockReturnValue(true);
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders offline message when offline', () => {
    mockedUseOnlineStatus.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it('mentions cached data when offline', () => {
    mockedUseOnlineStatus.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/cached data/i)).toBeInTheDocument();
  });

  it('mentions syncing when reconnected when offline', () => {
    mockedUseOnlineStatus.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/sync when you reconnect/i)).toBeInTheDocument();
  });

  it('renders an icon when offline', () => {
    mockedUseOnlineStatus.mockReturnValue(false);
    const { container } = render(<OfflineBanner />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
