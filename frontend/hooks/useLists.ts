import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ListItem {
  text: string;
  completed: boolean;
  added_at: string;
}

interface List {
  id: number;
  userId: string;
  guildId: string;
  name: string;
  items: ListItem[];
  createdAt: string;
}

export function useLists() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listsQuery = useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const response = await api.get<List[]>('/lists');
      return response.data || [];
    },
    refetchInterval: 15000, // Poll every 15 seconds
  });

  const createListMutation = useMutation({
    mutationFn: (newList: { name: string }) => api.post('/lists', newList),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({
        title: 'List created',
        description: 'Your list has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create list',
        variant: 'destructive',
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ listName, item }: { listName: string; item: string }) =>
      api.post(`/lists/${encodeURIComponent(listName)}/items`, { item }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({
        title: 'Item added',
        description: 'Item has been added to your list.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item',
        variant: 'destructive',
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ listName, itemText }: { listName: string; itemText: string }) =>
      api.delete(`/lists/${encodeURIComponent(listName)}/items/${encodeURIComponent(itemText)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({
        title: 'Item removed',
        description: 'Item has been removed from your list.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove item',
        variant: 'destructive',
      });
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ listName, itemText }: { listName: string; itemText: string }) =>
      api.patch(
        `/lists/${encodeURIComponent(listName)}/items/${encodeURIComponent(itemText)}/toggle`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle item',
        variant: 'destructive',
      });
    },
  });

  const clearCompletedMutation = useMutation({
    mutationFn: (listName: string) =>
      api.post(`/lists/${encodeURIComponent(listName)}/clear-completed`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({
        title: 'Completed items cleared',
        description: 'All completed items have been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear completed items',
        variant: 'destructive',
      });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (listName: string) => api.delete(`/lists/${encodeURIComponent(listName)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({
        title: 'List deleted',
        description: 'Your list has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete list',
        variant: 'destructive',
      });
    },
  });

  return {
    lists: listsQuery.data || [],
    isLoading: listsQuery.isLoading,
    error: listsQuery.error,
    createList: createListMutation.mutate,
    addItem: addItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
    toggleItem: toggleItemMutation.mutate,
    clearCompleted: clearCompletedMutation.mutate,
    deleteList: deleteListMutation.mutate,
    isCreating: createListMutation.isPending,
    isAddingItem: addItemMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
    isTogglingItem: toggleItemMutation.isPending,
    isClearingCompleted: clearCompletedMutation.isPending,
    isDeleting: deleteListMutation.isPending,
  };
}
