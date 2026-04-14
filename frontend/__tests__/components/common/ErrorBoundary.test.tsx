import { render, screen } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

const Safe = () => <div>Safe content</div>;

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Safe />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('catches error and renders fallback UI', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/we encountered an error/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders a Try Again button in the fallback', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('logs error to console', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('resets error state when Try Again is clicked', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    const user = userEvent.setup();

    // Component that can toggle error state via external prop
    let shouldThrow = true;
    const Conditional = () => {
      if (shouldThrow) throw new Error('Boom');
      return <div>Recovered</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    rerender(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered')).toBeInTheDocument();
    spy.mockRestore();
  });
});
