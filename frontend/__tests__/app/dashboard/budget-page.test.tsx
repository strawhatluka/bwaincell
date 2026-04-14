import { render, screen } from '@/__tests__/test-utils';
import BudgetPage from '@/app/dashboard/budget/page';

jest.mock('@/hooks/useBudget', () => ({
  useBudget: () => ({
    transactions: [],
    isLoading: false,
    createTransaction: jest.fn(),
    deleteTransaction: jest.fn(),
    isCreating: false,
  }),
}));

jest.mock('@/components/budget/TransactionForm', () => ({
  TransactionForm: () => <div data-testid="transaction-form" />,
}));

jest.mock('@/components/budget/TransactionList', () => ({
  TransactionList: () => <div data-testid="transaction-list" />,
}));

jest.mock('@/components/budget/BudgetSkeleton', () => ({
  BudgetPageSkeleton: () => <div data-testid="budget-skeleton" />,
  BudgetChartSkeleton: () => <div data-testid="budget-chart-skeleton" />,
}));

jest.mock('next/dynamic', () => () => {
  const Mock = () => <div data-testid="monthly-chart" />;
  Mock.displayName = 'MonthlyChart';
  return Mock;
});

describe('BudgetPage', () => {
  it('renders budget heading and transaction components when loaded', () => {
    render(<BudgetPage />);
    expect(screen.getByRole('heading', { name: /budget/i })).toBeInTheDocument();
    expect(screen.getByTestId('transaction-form')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-chart')).toBeInTheDocument();
  });
});

describe('BudgetPage loading state', () => {
  beforeEach(() => jest.resetModules());

  it('shows skeleton when loading', () => {
    jest.doMock('@/hooks/useBudget', () => ({
      useBudget: () => ({
        transactions: [],
        isLoading: true,
        createTransaction: jest.fn(),
        deleteTransaction: jest.fn(),
        isCreating: false,
      }),
    }));
    const LoadingBudgetPage = require('@/app/dashboard/budget/page').default;
    render(<LoadingBudgetPage />);
    expect(screen.getByTestId('budget-skeleton')).toBeInTheDocument();
  });
});
