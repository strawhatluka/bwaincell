import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { TransactionList } from '@/components/budget/TransactionList';

function makeTransaction(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 'u1',
    guildId: 'g1',
    amount: 25.5,
    type: 'expense' as 'income' | 'expense',
    category: 'Food',
    description: 'Lunch',
    date: '2024-06-15',
    createdAt: '2024-06-15T00:00:00.000Z',
    updatedAt: '2024-06-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('TransactionList', () => {
  let onDelete: jest.Mock;

  beforeEach(() => {
    onDelete = jest.fn();
  });

  it('renders empty state when no transactions', () => {
    render(<TransactionList transactions={[]} onDelete={onDelete} />);
    expect(screen.getByText(/No transactions yet/i)).toBeInTheDocument();
  });

  it('renders transactions', () => {
    render(
      <TransactionList
        transactions={[
          makeTransaction({ id: 1, description: 'Lunch', category: 'Food' }),
          makeTransaction({ id: 2, description: 'Paycheck', type: 'income', amount: 1000 }),
        ]}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Paycheck')).toBeInTheDocument();
  });

  it('displays expense with minus sign', () => {
    render(
      <TransactionList
        transactions={[makeTransaction({ id: 1, type: 'expense', amount: 25.5 })]}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText('-$25.50')).toBeInTheDocument();
  });

  it('displays income with plus sign', () => {
    render(
      <TransactionList
        transactions={[makeTransaction({ id: 1, type: 'income', amount: 1000 })]}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText('+$1000.00')).toBeInTheDocument();
  });

  it('applies green color class for income', () => {
    render(
      <TransactionList
        transactions={[makeTransaction({ id: 1, type: 'income', amount: 50 })]}
        onDelete={onDelete}
      />
    );
    const amountEl = screen.getByText('+$50.00');
    expect(amountEl.className).toContain('text-green-600');
  });

  it('applies red color class for expense', () => {
    render(
      <TransactionList
        transactions={[makeTransaction({ id: 1, type: 'expense', amount: 50 })]}
        onDelete={onDelete}
      />
    );
    const amountEl = screen.getByText('-$50.00');
    expect(amountEl.className).toContain('text-red-600');
  });

  it('shows category badge', () => {
    render(
      <TransactionList
        transactions={[makeTransaction({ category: 'Groceries' })]}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('opens delete dialog and calls onDelete on confirm', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={[makeTransaction({ id: 42 })]} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button');
    // Trash button on the transaction row
    await user.click(buttons[0]);
    expect(await screen.findByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(onDelete).toHaveBeenCalledWith(42);
  });

  it('cancels delete dialog without calling onDelete', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={[makeTransaction({ id: 42 })]} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(await screen.findByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
