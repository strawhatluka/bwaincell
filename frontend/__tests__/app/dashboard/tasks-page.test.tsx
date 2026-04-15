import { render, screen } from '@/__tests__/test-utils';
import TasksPage from '@/app/dashboard/tasks/page';

jest.mock('@/components/tasks/TaskList', () => ({
  TaskList: () => <div data-testid="task-list" />,
}));

describe('TasksPage', () => {
  it('renders the tasks heading and TaskList', () => {
    render(<TasksPage />);
    expect(screen.getByRole('heading', { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByText(/manage your to-do items/i)).toBeInTheDocument();
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
  });
});
