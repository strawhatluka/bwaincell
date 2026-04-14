import { render, screen } from '@/__tests__/test-utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { usePathname } from 'next/navigation';

const mockedUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('Sidebar', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/dashboard');
  });

  it('renders app brand heading', () => {
    render(<Sidebar />);
    expect(screen.getByText('Bwain.app')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /navigate to dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /navigate to tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /navigate to lists/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /navigate to notes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /navigate to reminders/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /navigate to budget/i })).toBeInTheDocument();
  });

  it('marks the active link with aria-current="page"', () => {
    mockedUsePathname.mockReturnValue('/dashboard/tasks');
    render(<Sidebar />);
    const tasksLink = screen.getByRole('link', { name: /navigate to tasks/i });
    expect(tasksLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive links with aria-current', () => {
    mockedUsePathname.mockReturnValue('/dashboard/tasks');
    render(<Sidebar />);
    const notesLink = screen.getByRole('link', { name: /navigate to notes/i });
    expect(notesLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('has hidden md:block classes to hide on mobile', () => {
    const { container } = render(<Sidebar />);
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('hidden');
    expect(aside).toHaveClass('md:block');
  });

  it('renders nav element with aria-label', () => {
    render(<Sidebar />);
    expect(screen.getByLabelText('Primary navigation')).toBeInTheDocument();
  });

  it('links have correct hrefs', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /navigate to tasks/i })).toHaveAttribute(
      'href',
      '/dashboard/tasks'
    );
    expect(screen.getByRole('link', { name: /navigate to budget/i })).toHaveAttribute(
      'href',
      '/dashboard/budget'
    );
  });
});
