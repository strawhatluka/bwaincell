# Frontend Components

**Source root:** `frontend/components/` (excluding `components/ui/` shadcn primitives, which are out of scope).

## Category Overview

### Tasks (`tasks/`)

| Component                                   | Key Props                      | Purpose                                        |
| ------------------------------------------- | ------------------------------ | ---------------------------------------------- |
| [TaskCreateForm](./tasks/TaskCreateForm.md) | `onCreate`, `isCreating`       | Inline create form.                            |
| [TaskItem](./tasks/TaskItem.md)             | `task`, `onUpdate`, `onDelete` | Single task row + edit/delete dialogs.         |
| [TaskList](./tasks/TaskList.md)             | —                              | Container w/ filter tabs, data via `useTasks`. |
| [TaskSkeleton](./tasks/TaskSkeleton.md)     | —                              | Loading placeholders.                          |

### Budget (`budget/`)

| Component                                      | Key Props                  | Purpose                                             |
| ---------------------------------------------- | -------------------------- | --------------------------------------------------- |
| [TransactionForm](./budget/TransactionForm.md) | `onCreate`, `isCreating`   | Dialog-triggered transaction form.                  |
| [TransactionList](./budget/TransactionList.md) | `transactions`, `onDelete` | Sorted transaction list with delete dialog.         |
| [MonthlyChart](./budget/MonthlyChart.md)       | `transactions`             | Totals cards + recharts bar chart (dynamic import). |
| [BudgetSkeleton](./budget/BudgetSkeleton.md)   | —                          | Loading placeholders (card, chart, page).           |

### Lists (`lists/`)

| Component                               | Key Props | Purpose                                 |
| --------------------------------------- | --------- | --------------------------------------- |
| [ListCard](./lists/ListCard.md)         | `list`    | Single list w/ items, add-item, delete. |
| [ListGrid](./lists/ListGrid.md)         | —         | Container + create dialog + grid.       |
| [ListSkeleton](./lists/ListSkeleton.md) | —         | Loading placeholders.                   |

### Notes (`notes/`)

| Component                               | Key Props                                          | Purpose                                           |
| --------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| [NoteCard](./notes/NoteCard.md)         | `note`, `onEdit`, `onDelete`                       | Card preview + view dialog.                       |
| [NoteEditor](./notes/NoteEditor.md)     | `note?`, `isOpen`, `onClose`, `onSave`, `isSaving` | Create/edit dialog with tag chips.                |
| [NoteGrid](./notes/NoteGrid.md)         | —                                                  | Container w/ search, editor, data via `useNotes`. |
| [NoteSkeleton](./notes/NoteSkeleton.md) | —                                                  | Loading placeholders.                             |

### Reminders (`reminders/`)

| Component                                               | Key Props                | Purpose                             |
| ------------------------------------------------------- | ------------------------ | ----------------------------------- |
| [ReminderCreateForm](./reminders/ReminderCreateForm.md) | `onCreate`, `isCreating` | Create form (not currently wired).  |
| [ReminderItem](./reminders/ReminderItem.md)             | `reminder`, `onDelete`   | Single reminder row.                |
| [ReminderList](./reminders/ReminderList.md)             | —                        | Container, data via `useReminders`. |
| [ReminderSkeleton](./reminders/ReminderSkeleton.md)     | —                        | Loading placeholders.               |

### Common (`common/`)

| Component                                  | Key Props                                                                                  | Purpose                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| [ConfirmDialog](./common/ConfirmDialog.md) | `open`, `onOpenChange`, `title`, `description`, `onConfirm`, `confirmText?`, `cancelText?` | Destructive confirmation over `AlertDialog`. |
| [EmptyState](./common/EmptyState.md)       | `icon`, `title`, `description`, `actionLabel?`, `onAction?`                                | Centered empty-state with optional CTA.      |
| [ErrorBoundary](./common/ErrorBoundary.md) | `children`                                                                                 | Class-based React error boundary.            |
| [OfflineBanner](./common/OfflineBanner.md) | —                                                                                          | Yellow banner driven by `useOnlineStatus`.   |

### Layout (`layout/`)

| Component                          | Key Props | Purpose                                        |
| ---------------------------------- | --------- | ---------------------------------------------- |
| [Header](./layout/Header.md)       | —         | Top bar: page title, install, avatar dropdown. |
| [Sidebar](./layout/Sidebar.md)     | —         | Desktop-only left nav.                         |
| [MobileNav](./layout/MobileNav.md) | —         | Mobile hamburger `Sheet` drawer nav.           |

## Conventions

- Every dashboard-scoped container calls its matching React Query hook from `frontend/hooks/`.
- Destructive actions always go through a dialog (`Dialog` or `AlertDialog`).
- Dynamic path segments are always `encodeURIComponent`-wrapped (see `useLists`).
- shadcn/ui primitives under `frontend/components/ui/` are intentionally **out of scope** of these docs (upstream-maintained).
