import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: number;
  userId: string;
  guildId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export function useBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await api.get<Transaction[]>('/budget/transactions');
      return response.data || [];
    },
    refetchInterval: 15000, // Poll every 15 seconds
  });

  const createTransactionMutation = useMutation({
    mutationFn: (newTransaction: {
      amount: number;
      type: 'income' | 'expense';
      category: string;
      description: string;
      date: string;
    }) => api.post('/budget/transactions', newTransaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transaction added',
        description: 'Your transaction has been recorded successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add transaction',
        variant: 'destructive',
      });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Transaction> }) =>
      api.patch(`/budget/transactions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transaction updated',
        description: 'Your transaction has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update transaction',
        variant: 'destructive',
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/budget/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transaction deleted',
        description: 'Your transaction has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete transaction',
        variant: 'destructive',
      });
    },
  });

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    error: transactionsQuery.error,
    createTransaction: createTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
  };
}
