import { render, screen } from '@/__tests__/test-utils';
import { MonthlyChart } from '@/components/budget/MonthlyChart';

// Mock recharts to avoid ResponsiveContainer / ResizeObserver issues in jsdom
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-length={data?.length ?? 0}>
      {children}
    </div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

function makeTx(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 'u1',
    guildId: 'g1',
    amount: 10,
    type: 'expense' as 'income' | 'expense',
    category: 'Food',
    description: 'x',
    date: '2024-06-15',
    createdAt: '2024-06-15T00:00:00.000Z',
    updatedAt: '2024-06-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('MonthlyChart', () => {
  it('renders Budget Overview title', () => {
    render(<MonthlyChart transactions={[]} />);
    expect(screen.getByText('Budget Overview')).toBeInTheDocument();
  });

  it('shows "No data to display" message when empty', () => {
    render(<MonthlyChart transactions={[]} />);
    expect(screen.getByText(/No data to display/i)).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders chart when transactions present', () => {
    render(
      <MonthlyChart
        transactions={[
          makeTx({ id: 1, type: 'income', amount: 1000, category: 'Salary' }),
          makeTx({ id: 2, type: 'expense', amount: 100, category: 'Food' }),
        ]}
      />
    );
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('calculates total income', () => {
    render(
      <MonthlyChart
        transactions={[
          makeTx({ id: 1, type: 'income', amount: 500, category: 'Salary' }),
          makeTx({ id: 2, type: 'income', amount: 250, category: 'Bonus' }),
        ]}
      />
    );
    expect(screen.getAllByText('$750.00').length).toBeGreaterThan(0);
  });

  it('calculates total expenses', () => {
    render(
      <MonthlyChart
        transactions={[
          makeTx({ id: 1, type: 'expense', amount: 100, category: 'Food' }),
          makeTx({ id: 2, type: 'expense', amount: 50, category: 'Gas' }),
        ]}
      />
    );
    // $150.00 for expense total
    const matches = screen.getAllByText('$150.00');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('computes positive net balance', () => {
    render(
      <MonthlyChart
        transactions={[
          makeTx({ id: 1, type: 'income', amount: 1000, category: 'Salary' }),
          makeTx({ id: 2, type: 'expense', amount: 300, category: 'Rent' }),
        ]}
      />
    );
    expect(screen.getByText('Net Balance')).toBeInTheDocument();
    expect(screen.getByText('$700.00')).toBeInTheDocument();
  });

  it('passes chart data grouped by category', () => {
    render(
      <MonthlyChart
        transactions={[
          makeTx({ id: 1, type: 'expense', amount: 10, category: 'Food' }),
          makeTx({ id: 2, type: 'expense', amount: 20, category: 'Food' }),
          makeTx({ id: 3, type: 'income', amount: 100, category: 'Salary' }),
        ]}
      />
    );
    const chart = screen.getByTestId('bar-chart');
    // 2 unique categories -> data length 2
    expect(chart.getAttribute('data-length')).toBe('2');
  });
});
