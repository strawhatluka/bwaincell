'use client';

import { useState } from 'react';
import { useLists } from '@/hooks/useLists';
import { ListCard } from './ListCard';
import { ListGridSkeleton } from './ListSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, List as ListIcon } from 'lucide-react';

export function ListGrid() {
  const { lists, isLoading, createList, deleteList, isCreating } = useLists();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    createList({ name: newListName.trim() });
    setNewListName('');
    setIsCreateOpen(false);
  };

  if (isLoading) {
    return <ListGridSkeleton />;
  }

  return (
    <div>
      <div className="mb-6">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#f59e0b] hover:bg-[#e08c00]">
              <Plus className="w-4 h-4 mr-2" />
              Create List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateList}>
              <DialogHeader>
                <DialogTitle>Create New List</DialogTitle>
                <DialogDescription>
                  Give your list a title. You can add items after creating it.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">List Name</Label>
                  <Input
                    id="name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Shopping List, Travel Packing, etc."
                    disabled={isCreating}
                    className="border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !newListName.trim()}
                  className="bg-[#f59e0b] hover:bg-[#e08c00]"
                >
                  {isCreating ? 'Creating...' : 'Create List'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <ListIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">No lists yet</h3>
          <p className="text-muted-foreground mb-4">Create your first list to get organized!</p>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-[#f59e0b] hover:bg-[#e08c00]">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First List
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}
