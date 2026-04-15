import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

describe('ConfirmDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    title: 'Delete Item',
    description: 'Are you sure you want to delete this item?',
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and description when open', () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('renders default button labels', () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders custom button labels', () => {
    render(<ConfirmDialog {...baseProps} confirmText="Log Out" cancelText="Nevermind" />);
    expect(screen.getByRole('button', { name: 'Log Out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nevermind' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    render(<ConfirmDialog {...baseProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalled();
  });

  it('does not render dialog content when closed', () => {
    render(<ConfirmDialog {...baseProps} open={false} />);
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
  });
});
