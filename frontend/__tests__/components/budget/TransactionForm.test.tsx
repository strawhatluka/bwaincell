import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { TransactionForm } from '@/components/budget/TransactionForm';

describe('TransactionForm', () => {
  let onCreate: jest.Mock;

  beforeEach(() => {
    onCreate = jest.fn();
  });

  async function openDialog() {
    const user = userEvent.setup();
    render(<TransactionForm onCreate={onCreate} isCreating={false} />);
    await user.click(screen.getByRole('button', { name: /Add Transaction/i }));
    return user;
  }

  it('renders trigger button', () => {
    render(<TransactionForm onCreate={onCreate} isCreating={false} />);
    expect(screen.getByRole('button', { name: /Add Transaction/i })).toBeInTheDocument();
  });

  it('opens dialog with amount, category, description inputs', async () => {
    await openDialog();
    expect(await screen.findByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
  });

  it('submits with type=expense by default when all fields filled', async () => {
    const user = await openDialog();
    await user.type(await screen.findByLabelText('Amount'), '25.50');
    await user.type(screen.getByLabelText('Category'), 'Food');
    await user.type(screen.getByLabelText('Description'), 'Lunch');
    await user.click(screen.getByRole('button', { name: /^Add Transaction$/i }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 25.5,
        type: 'expense',
        category: 'Food',
        description: 'Lunch',
      })
    );
  });

  it('disables submit when amount is missing', async () => {
    const user = await openDialog();
    await screen.findByLabelText('Amount');
    await user.type(screen.getByLabelText('Category'), 'Food');
    await user.type(screen.getByLabelText('Description'), 'Lunch');
    const submitBtn = screen.getByRole('button', { name: /^Add Transaction$/i });
    expect(submitBtn).toBeDisabled();
  });

  it('disables submit when category is missing', async () => {
    const user = await openDialog();
    await user.type(await screen.findByLabelText('Amount'), '10');
    await user.type(screen.getByLabelText('Description'), 'Lunch');
    expect(screen.getByRole('button', { name: /^Add Transaction$/i })).toBeDisabled();
  });

  it('disables submit when description is missing', async () => {
    const user = await openDialog();
    await user.type(await screen.findByLabelText('Amount'), '10');
    await user.type(screen.getByLabelText('Category'), 'Food');
    expect(screen.getByRole('button', { name: /^Add Transaction$/i })).toBeDisabled();
  });

  it('does not submit with zero/empty amount', async () => {
    const user = await openDialog();
    await user.type(screen.getByLabelText('Category'), 'Food');
    await user.type(screen.getByLabelText('Description'), 'x');
    const submit = screen.getByRole('button', { name: /^Add Transaction$/i });
    expect(submit).toBeDisabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('parses amount to float', async () => {
    const user = await openDialog();
    await user.type(await screen.findByLabelText('Amount'), '99.99');
    await user.type(screen.getByLabelText('Category'), 'X');
    await user.type(screen.getByLabelText('Description'), 'Y');
    await user.click(screen.getByRole('button', { name: /^Add Transaction$/i }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 99.99 }));
  });

  it('cancel button closes the dialog', async () => {
    const user = await openDialog();
    await screen.findByLabelText('Amount');
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
  });

  it('shows "Adding..." when isCreating', async () => {
    const user = userEvent.setup();
    render(<TransactionForm onCreate={onCreate} isCreating={true} />);
    await user.click(screen.getByRole('button', { name: /^Add Transaction$/i }));
    expect(await screen.findByRole('button', { name: /Adding\.\.\./i })).toBeInTheDocument();
  });
});
