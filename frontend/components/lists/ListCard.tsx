'use client';

import { useState } from 'react';
import { useLists } from '@/hooks/useLists';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface ListCardProps {
  list: List;
}

export function ListCard({ list }: ListCardProps) {
  const { addItem, removeItem, toggleItem, clearCompleted, deleteList, isAddingItem } = useLists();
  const [newItem, setNewItem] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    addItem({ listName: list.name, item: newItem.trim() });
    setNewItem('');
  };

  const handleRemoveItem = (itemText: string) => {
    removeItem({ listName: list.name, itemText });
  };

  const handleToggleCheck = (itemText: string) => {
    toggleItem({ listName: list.name, itemText });
  };

  const handleClearCompleted = () => {
    const completedCount = list.items.filter((item) => item.completed).length;
    if (completedCount > 0) {
      clearCompleted(list.name);
    }
  };

  const handleDelete = () => {
    deleteList(list.name);
    setIsDeleteOpen(false);
  };

  return (
    <>
      <Card className="p-5 hover:shadow-lg transition-shadow border-[#f59e0b]/20">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{list.name}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="hover:bg-red-50 hover:text-red-600 -mt-1 -mr-1"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 mb-4">
          {list.items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No items yet</p>
          ) : (
            list.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 group">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => handleToggleCheck(item.text)}
                  className="data-[state=checked]:bg-[#f59e0b] data-[state=checked]:border-[#f59e0b]"
                />
                <span
                  className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                >
                  {item.text}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.text)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddItem} className="flex gap-2 mb-3">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add item..."
            disabled={isAddingItem}
            className="text-sm border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newItem.trim() || isAddingItem}
            className="bg-[#f59e0b] hover:bg-[#e08c00] shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </form>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {list.items.length} {list.items.length === 1 ? 'item' : 'items'}
            {list.items.filter((item) => item.completed).length > 0 && (
              <span className="text-muted-foreground/70">
                {' '}
                ({list.items.filter((item) => item.completed).length} completed)
              </span>
            )}
          </p>
          {list.items.filter((item) => item.completed).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCompleted}
              className="text-xs text-muted-foreground hover:text-[#f59e0b] h-auto p-1"
            >
              Clear completed
            </Button>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{list.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
