import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Reminder {
  id: number;
  userId: string;
  guildId: string;
  message: string;
  frequency: 'once' | 'daily' | 'weekly';
  time: string;
  dayOfWeek?: number;
  nextTrigger: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useReminders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const remindersQuery = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const response = await api.get<Reminder[]>('/reminders');
      return response.data || [];
    },
    refetchInterval: 15000, // Poll every 15 seconds
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({
        title: 'Reminder deleted',
        description: 'Your reminder has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete reminder',
        variant: 'destructive',
      });
    },
  });

  return {
    reminders: remindersQuery.data || [],
    isLoading: remindersQuery.isLoading,
    error: remindersQuery.error,
    deleteReminder: deleteReminderMutation.mutate,
    isDeleting: deleteReminderMutation.isPending,
  };
}
