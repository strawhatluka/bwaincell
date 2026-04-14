import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { Inbox } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState icon={Inbox} title="No items" description="There are no items to display." />
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('There are no items to display.')).toBeInTheDocument();
  });

  it('renders the provided icon', () => {
    const { container } = render(
      <EmptyState icon={Inbox} title="Empty" description="Nothing here" />
    );
    // lucide icons render as svg
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not render action button when actionLabel is absent', () => {
    render(<EmptyState icon={Inbox} title="Empty" description="Nothing here" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders action button when actionLabel and onAction are provided', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        description="Nothing here"
        actionLabel="Create Item"
        onAction={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        description="Nothing here"
        actionLabel="Create"
        onAction={onAction}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action button if onAction is missing', () => {
    render(
      <EmptyState icon={Inbox} title="Empty" description="Nothing here" actionLabel="Create" />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
