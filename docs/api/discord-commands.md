# Discord Bot Commands Reference

**Version:** 2.1.0
**Last Updated:** 2026-04-15
**Bot:** Bwaincell Discord Bot
**Framework:** Discord.js v14
**Database:** Supabase (PostgreSQL)

## Overview

Bwaincell provides 12 slash commands for managing tasks, lists, notes, reminders, budgets, schedules, GitHub issues, random utilities, recipes, meal plans, local events, dramatic quote images, and daily sunset announcements. All commands use Discord's modern slash command interface with autocomplete, interactive buttons, and embeds.

**Command Prefix:** `/` (Discord slash commands)
**Guild Isolation:** All data is isolated per Discord server (guild)
**Shared Access:** Household members can access all server data (user_id for audit only)

---

## Table of Contents

1. [Task Management](#1-task-management---task)
2. [List Management](#2-list-management---list)
3. [Note Management](#3-note-management---note)
4. [Reminder System](#4-reminder-system---remind)
5. [Budget Tracking](#5-budget-tracking---budget)
6. [Schedule Management](#6-schedule-management---schedule)
7. [GitHub Issues](#7-github-issues---issues)
8. [Random Utilities](#8-random-utilities---random)
9. [Recipe Management](#9-recipe-management---recipe)
10. [Local Events](#10-local-events---events)
11. [Make it a Quote](#11-make-it-a-quote---make-it-a-quote)
12. [Sunset Announcements](#12-sunset-announcements---sunset)

---

## 1. Task Management - `/task`

Manage your personal and household tasks with due dates, completion tracking, and interactive controls.

### Subcommands

#### `/task add`

Create a new task with optional due date and time.

**Options:**

- `description` (required, string) - Task description
- `date` (optional, string) - Due date in MM-DD-YYYY format (e.g., 10-03-2025)
- `time` (optional, string) - Due time in 12-hour format (e.g., 2:30 PM)

**Example:**

```
/task add description:"Buy groceries" date:"01-15-2026" time:"2:30 PM"
```

**Response:**

- ✨ Embed showing task created with task ID
- 📅 Due date displayed if provided
- Interactive buttons: Mark as Done, Edit Task, View All Tasks

**Notes:**

- Date and time must both be provided or both omitted
- Task ID auto-increments starting from 1
- Tasks are guild-isolated (shared with all server members)

---

#### `/task list`

Display your tasks with optional filtering.

**Options:**

- `filter` (optional, choice) - Filter tasks by status
  - `All` - Show all tasks (default)
  - `Pending` - Show incomplete tasks only
  - `Completed` - Show finished tasks only

**Example:**

```
/task list filter:"Pending"
```

**Response:**

- 📋 Embed with task list (up to 25 tasks)
- Status indicators: ✅ Completed, ⏳ Pending
- Due dates displayed for each task
- Interactive buttons: Quick Complete, Add New Task, Refresh
- Select menu for quick actions (if ≤25 tasks)

**Pagination:**

- Shows first 25 tasks with footer indicating total count

---

#### `/task done`

Mark a task as completed.

**Options:**

- `task_id` (required, integer, autocomplete) - Task ID to complete

**Example:**

```
/task done task_id:5
```

**Autocomplete:**

- Shows pending tasks with IDs, descriptions, and due dates
- Format: `#5 ⏳ Buy groceries (Due: 1/15/2026)`

**Response:**

- 🎉 Embed confirming task completion
- Completed timestamp recorded
- Interactive buttons: Add Another Task, View Pending Tasks, View All Tasks

**Error Handling:**

- Returns error if task not found or doesn't belong to guild

---

#### `/task delete`

Remove a task permanently.

**Options:**

- `task_id` (required, integer, autocomplete) - Task ID to delete

**Example:**

```
/task delete task_id:7
```

**Response:**

- 🗑️ Embed confirming task deletion
- Interactive buttons: Add New Task, View Remaining Tasks

**Warning:**

- This action is permanent and cannot be undone

---

#### `/task edit`

Edit a task's description.

**Options:**

- `task_id` (required, integer, autocomplete) - Task ID to edit
- `new_text` (required, string) - New task description

**Example:**

```
/task edit task_id:3 new_text:"Buy groceries and milk"
```

**Response:**

- ✏️ Embed showing updated task
- Interactive buttons: Mark as Done, Delete Task, View All Tasks

**Notes:**

- Only description can be edited (due date editing not yet supported)

---

### Task Data Model

**Database Table:** `tasks`

**Fields:**

- `id` (integer, primary key) - Auto-incrementing task ID
- `description` (string, required) - Task description
- `due_date` (datetime, nullable) - Due date and time
- `completed` (boolean) - Completion status (default: false)
- `created_at` (datetime) - Creation timestamp
- `completed_at` (datetime, nullable) - Completion timestamp
- `user_id` (string) - Creator Discord user ID (audit only)
- `guild_id` (string, indexed) - Discord server ID

**Relationships:**

- None

**Indexes:**

- `guild_id` - For guild isolation

---

## 2. List Management - `/list`

Create and manage shared lists with checkable items. Perfect for shopping lists, to-do lists, and collaborative tracking.

### Subcommands

#### `/list create`

Create a new list.

**Options:**

- `name` (required, string) - List name

**Example:**

```
/list create name:"Shopping List"
```

**Response:**

- ✅ Embed confirming list creation
- Interactive buttons: Add Item, View List

**Error Handling:**

- Returns error if list name already exists (case-insensitive)

---

#### `/list add`

Add an item to an existing list.

**Options:**

- `list_name` (required, string, autocomplete) - Name of the list
- `item` (required, string) - Item to add

**Example:**

```
/list add list_name:"Shopping List" item:"Milk"
```

**Autocomplete:**

- Shows all guild lists with names

**Response:**

- ✅ Embed confirming item added
- Shows total item count

---

#### `/list show`

Display all items in a list.

**Options:**

- `list_name` (required, string, autocomplete) - Name of the list to show

**Example:**

```
/list show list_name:"Shopping List"
```

**Response:**

- 📋 Embed with numbered list of items
- Status indicators: ✅ Completed, ⬜ Pending
- Footer shows completion ratio (e.g., "3/10 completed")
- Interactive buttons: Add Item, Mark Complete, Clear Completed

**Empty List:**

- Shows "This list is empty" message

---

#### `/list remove`

Remove an item from a list.

**Options:**

- `list_name` (required, string, autocomplete) - Name of the list
- `item` (required, string, autocomplete) - Item to remove

**Example:**

```
/list remove list_name:"Shopping List" item:"Milk"
```

**Autocomplete:**

- `list_name`: Shows all guild lists
- `item`: Shows all items in selected list

**Response:**

- Text confirmation: "Removed 'Milk' from list 'Shopping List'"

**Error Handling:**

- Returns error if list or item not found

---

#### `/list complete`

Mark an item as complete (toggleable).

**Options:**

- `list_name` (required, string, autocomplete) - Name of the list
- `item` (required, string, autocomplete) - Item to mark as complete

**Example:**

```
/list complete list_name:"Shopping List" item:"Milk"
```

**Response:**

- Text confirmation: "Item 'Milk' marked as completed"

**Notes:**

- Running command again will mark item as incomplete (toggle)

---

#### `/list clear`

Clear all completed items from a list.

**Options:**

- `list_name` (required, string, autocomplete) - Name of the list

**Example:**

```
/list clear list_name:"Shopping List"
```

**Response:**

- Text confirmation: "Cleared completed items from list 'Shopping List'"

**Use Case:**

- Clean up lists after shopping trips or completed tasks

---

#### `/list delete`

Delete an entire list permanently.

**Options:**

- `list_name` (required, string, autocomplete) - Name of the list to delete

**Example:**

```
/list delete list_name:"Shopping List"
```

**Response:**

- Confirmation prompt with buttons: Confirm Delete (red), Cancel (gray)

**Warning:**

- This action is permanent and cannot be undone
- All items in the list will be deleted

---

#### `/list all`

Show all your lists.

**Example:**

```
/list all
```

**Response:**

- 📋 Embed with list of all guild lists
- Shows item count and completion count for each list
- Format: `📋 **Shopping List** - 10 items (3 completed)`
- Select menu for quick view (if ≤5 lists)
- Footer shows total list count

**Empty State:**

- Shows "You have no lists" message

---

### List Data Model

**Database Table:** `lists`

**Fields:**

- `id` (integer, primary key) - Auto-incrementing list ID
- `name` (string, required, unique per guild) - List name
- `items` (JSONB array) - Array of list items (PostgreSQL JSONB)
- `user_id` (string) - Creator Discord user ID (audit only)
- `guild_id` (string, indexed) - Discord server ID
- `created_at` (datetime) - Creation timestamp

**List Item Structure (JSONB):**

```json
{
  "text": "Milk",
  "completed": false,
  "added_at": "2026-01-11T12:00:00Z"
}
```

**Relationships:**

- None

**Indexes:**

- `guild_id` - For guild isolation

---

## 3. Note Management - `/note`

Store and organize notes with tagging, search, and edit capabilities.

### Subcommands

#### `/note add`

Create a new note with optional tags.

**Options:**

- `title` (required, string) - Note title
- `content` (required, string) - Note content
- `tags` (optional, string) - Comma-separated tags

**Example:**

```
/note add title:"Meeting Notes" content:"Discussed project timeline" tags:"work,meeting"
```

**Response:**

- ✅ Embed confirming note created
- Shows note ID and title
- Displays tags if provided

---

#### `/note list`

Show all your notes.

**Example:**

```
/note list
```

**Response:**

- 📝 Embed with list of notes (up to 10 notes)
- Shows note ID, title, tags, and content preview (first 50 characters)
- Format: `**#5** - Meeting Notes [work, meeting]\n📝 Discussed project timeli...`
- Footer shows total note count

**Pagination:**

- Shows first 10 notes with footer indicating total count

**Empty State:**

- Shows "You have no notes" message

---

#### `/note view`

Display a specific note.

**Options:**

- `title` (required, string, autocomplete) - Note title to view

**Example:**

```
/note view title:"Meeting Notes"
```

**Autocomplete:**

- Shows all guild note titles

**Response:**

- 📝 Embed with full note content
- Shows title, content, tags, creation date
- Shows last updated date if different from creation date

---

#### `/note delete`

Remove a note permanently.

**Options:**

- `title` (required, string, autocomplete) - Note title to delete

**Example:**

```
/note delete title:"Meeting Notes"
```

**Response:**

- Text confirmation: "Note 'Meeting Notes' has been deleted"

**Warning:**

- This action is permanent and cannot be undone

---

#### `/note edit`

Edit an existing note.

**Options:**

- `current_title` (required, string, autocomplete) - Current note title
- `new_title` (optional, string) - New title (leave empty to keep current)
- `content` (optional, string) - New content (leave empty to keep current)
- `tags` (optional, string) - New comma-separated tags

**Example:**

```
/note edit current_title:"Meeting Notes" new_title:"Q1 Meeting Notes" content:"Updated content"
```

**Response:**

- ✅ Embed confirming note updated
- Shows new title and tags

**Notes:**

- At least one field (new_title, content, or tags) must be provided
- Omitted fields remain unchanged
- `updated_at` timestamp automatically updated

---

#### `/note search`

Search notes by keyword.

**Options:**

- `keyword` (required, string) - Keyword to search for

**Example:**

```
/note search keyword:"project"
```

**Behavior:**

- Searches in both title and content fields
- Case-insensitive partial matching
- SQL LIKE operator: `%keyword%`

**Response:**

- 📝 Embed with search results (up to 10 notes)
- Shows note ID, title, and tags
- Footer shows total results count

**Empty Results:**

- Shows "No notes found containing 'keyword'" message

---

#### `/note tag`

Find notes by tag.

**Options:**

- `tag` (required, string) - Tag to search for

**Example:**

```
/note tag tag:"work"
```

**Behavior:**

- Searches notes with matching tag
- Case-insensitive exact matching

**Response:**

- 📝 Embed with tagged notes (up to 10 notes)
- Shows note ID and title
- Footer shows total results count

**Empty Results:**

- Shows "No notes found with tag 'work'" message

---

#### `/note tags`

List all your tags.

**Example:**

```
/note tags
```

**Response:**

- 🏷️ Embed with list of all unique tags
- Format: `🏷️ work\n🏷️ meeting\n🏷️ personal`
- Footer shows total unique tag count

**Empty State:**

- Shows "No tags found in your notes" message

---

### Note Data Model

**Database Table:** `notes`

**Fields:**

- `id` (integer, primary key) - Auto-incrementing note ID
- `title` (string, required) - Note title
- `content` (text, required) - Note content
- `tags` (string array) - Tags (PostgreSQL array type)
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp
- `user_id` (string) - Creator Discord user ID (audit only)
- `guild_id` (string, indexed) - Discord server ID

**Relationships:**

- None

**Indexes:**

- `guild_id` - For guild isolation
- `title` - For search performance
- `content` - For search performance (optional GIN index)

---

## 4. Reminder System - `/remind`

Set one-time, daily, and weekly reminders with timezone support and automatic scheduling.

### Subcommands

#### `/remind me`

Set a one-time reminder.

**Options:**

- `message` (required, string) - Reminder message
- `time` (required, string) - Time in 12-hour format (e.g., 2:30 PM)

**Example:**

```
/remind me message:"Take out trash" time:"7:00 PM"
```

**Response:**

- ⏰ Embed confirming reminder set
- Shows message, time (12-hour format), frequency (One-time)
- Shows next trigger time in configured timezone
- Interactive buttons: Cancel Reminder, View All Reminders, Add Another

**Behavior:**

- If time has passed today, schedules for tomorrow
- Uses configured timezone (default: America/Chicago)
- Reminder deleted after triggering

---

#### `/remind daily`

Set a daily recurring reminder.

**Options:**

- `message` (required, string) - Reminder message
- `time` (required, string) - Time in 12-hour format (e.g., 2:30 PM)

**Example:**

```
/remind daily message:"Morning standup" time:"9:00 AM"
```

**Response:**

- ⏰ Embed confirming daily reminder set
- Shows message, time, frequency (Daily)
- Shows next trigger time in configured timezone
- Interactive buttons: Cancel Reminder, View All Reminders, Add Another

**Behavior:**

- Repeats every day at specified time
- If time has passed today, first trigger is tomorrow
- Automatically reschedules after each trigger

---

#### `/remind weekly`

Set a weekly recurring reminder.

**Options:**

- `message` (required, string) - Reminder message
- `day` (required, choice) - Day of week
  - Sunday (0), Monday (1), Tuesday (2), Wednesday (3), Thursday (4), Friday (5), Saturday (6)
- `time` (required, string) - Time in 12-hour format (e.g., 2:30 PM)

**Example:**

```
/remind weekly message:"Team meeting" day:"Monday" time:"10:00 AM"
```

**Response:**

- ⏰ Embed confirming weekly reminder set
- Shows message, day of week, time, frequency (Weekly)
- Shows next trigger time in configured timezone
- Interactive buttons: Cancel Reminder, View All Reminders, Add Another

**Behavior:**

- Repeats every week on specified day at specified time
- If day/time has passed this week, schedules for next week
- Automatically reschedules after each trigger

---

#### `/remind list`

Show all your reminders.

**Example:**

```
/remind list
```

**Response:**

- 📋 Embed with list of active reminders (up to 25 reminders)
- Shows reminder ID, message, frequency, time, next trigger
- Emoji indicators: ⏰ One-time, 📅 Daily, 📆 Weekly
- Format: `⏰ **#3** - "Take out trash"\n🕐 7:00 PM | One-time\n⏱️ Next: January 11, 2026 at 7:00 PM CST`
- Interactive buttons: Add New Reminder, Refresh
- Select menu for quick management (if ≤25 reminders)
- Footer shows total reminder count

**Empty State:**

- Shows "You don't have any active reminders" message
- Interactive buttons: Create Daily Reminder, Create Weekly Reminder, One-Time Reminder

---

#### `/remind delete`

Remove a reminder permanently.

**Options:**

- `reminder_id` (required, integer, autocomplete) - Reminder ID to delete

**Example:**

```
/remind delete reminder_id:5
```

**Autocomplete:**

- Shows active reminders with IDs, messages, frequency, and time
- Format: `#5 - Take out trash (One-time at 7:00 PM)`

**Response:**

- 🗑️ Embed confirming reminder cancelled
- Interactive buttons: Add New Reminder, View Remaining

**Notes:**

- Reminder is marked as inactive (soft delete)
- Scheduler automatically skips inactive reminders

---

### Reminder Data Model

**Database Table:** `reminders`

**Fields:**

- `id` (integer, primary key) - Auto-incrementing reminder ID
- `message` (string, required) - Reminder message
- `time` (string, required) - Time in 24-hour format (HH:MM)
- `frequency` (enum, required) - Reminder frequency: 'once', 'daily', 'weekly'
- `day_of_week` (integer, nullable) - Day for weekly reminders (0-6, Sun-Sat)
- `channel_id` (string, required) - Discord channel ID for announcements
- `user_id` (string) - Creator Discord user ID (audit only)
- `guild_id` (string, indexed) - Discord server ID
- `active` (boolean) - Active status (default: true)
- `next_trigger` (datetime, indexed) - Next scheduled trigger time

**Relationships:**

- None

**Indexes:**

- `guild_id` - For guild isolation
- `next_trigger` - For scheduler performance
- `active` - For filtering active reminders

**Timezone Handling:**

- Uses Luxon DateTime for timezone-aware calculations
- Configured timezone: `process.env.TIMEZONE` (default: America/Chicago)
- `next_trigger` stored as JavaScript Date (UTC) but calculated in local timezone

**Scheduler:**

- Node-cron job runs every minute
- Checks for reminders where `next_trigger <= now` and `active = true`
- Sends message to configured channel
- Updates `next_trigger` for recurring reminders
- Marks one-time reminders as inactive

---

## 5. Budget Tracking - `/budget`

Track income, expenses, and spending by category with summaries and trends.

### Subcommands

#### `/budget add`

Add an expense.

**Options:**

- `category` (required, string) - Expense category (e.g., "Groceries", "Gas")
- `amount` (required, number) - Amount spent (must be > 0)
- `description` (optional, string) - Description of expense

**Example:**

```
/budget add category:"Groceries" amount:45.50 description:"Walmart shopping"
```

**Response:**

- 💸 Embed showing expense recorded
- Shows category, amount (formatted as currency)
- Color: Red (0xff0000)
- Displays description if provided

**Validation:**

- Amount must be greater than 0

---

#### `/budget income`

Add income.

**Options:**

- `amount` (required, number) - Income amount (must be > 0)
- `description` (optional, string) - Income source/description

**Example:**

```
/budget income amount:1500.00 description:"Paycheck"
```

**Response:**

- 💰 Embed showing income recorded
- Shows amount (formatted as currency)
- Color: Green (0x00ff00)
- Displays source if provided

**Notes:**

- Category automatically set to "Income"

---

#### `/budget summary`

Show budget summary.

**Options:**

- `month` (optional, integer, 1-12) - Month number (defaults to current month)

**Example:**

```
/budget summary month:12
```

**Response:**

- 💵 Embed with budget summary
- Title: "Budget Summary - December" (or "Current Month")
- Shows total income, total expenses, balance
- Color: Green if balance ≥ 0, Red if balance < 0
- Top 5 expense categories with amounts and percentages
- Footer shows total transaction count

**Calculations:**

- Income: Sum of all income entries
- Expenses: Sum of all expense entries
- Balance: Income - Expenses
- Category percentages: (Category total / Total expenses) × 100

**Date Range:**

- If month specified: First day to last day of that month
- If omitted: Current month (from 1st to last day)

---

#### `/budget categories`

List spending by category.

**Example:**

```
/budget categories
```

**Response:**

- 📊 Embed with spending breakdown by category
- Shows up to 15 categories
- Format: `1. **Groceries**\n   $150.00 (12 transactions)\n   ████████`
- Bar chart visualization (█ per $100)
- Sorted by total amount (descending)
- Footer shows total category count if > 15

**Empty State:**

- Shows "No expense categories found" message

---

#### `/budget recent`

Show recent transactions.

**Options:**

- `limit` (optional, integer, 1-25) - Number of transactions to show (default: 10)

**Example:**

```
/budget recent limit:20
```

**Response:**

- 📋 Embed with recent transactions
- Shows transactions ordered by date (newest first)
- Format: `💰 1/11/2026 | **+$1500.00** | Income - Paycheck`
- Emoji indicators: 💰 Income, 💸 Expense
- Shows date, amount (with + or - sign), category, description
- Footer shows transaction count

**Empty State:**

- Shows "No transactions found" message

---

#### `/budget trend`

Show monthly spending trend.

**Options:**

- `months` (optional, integer, 1-12) - Number of months to show (default: 6)

**Example:**

```
/budget trend months:12
```

**Response:**

- 📈 Embed with monthly trend data
- Shows each month with income, expenses, balance
- Format: `**Jan 2026**\n💰 Income: $3000.00\n💸 Expenses: $2400.00\n✅ Balance: $600.00`
- Balance emoji: ✅ if ≥ 0, ❌ if < 0
- Months ordered chronologically (oldest to newest)

**Calculations:**

- Analyzes last N months from current month
- Each month: First day to last day of month

---

### Budget Data Model

**Database Table:** `budgets`

**Fields:**

- `id` (integer, primary key) - Auto-incrementing entry ID
- `type` (enum, required) - Entry type: 'expense' or 'income'
- `category` (string, nullable) - Expense category (null for income)
- `amount` (decimal, required) - Amount (positive value)
- `description` (string, nullable) - Optional description
- `date` (datetime) - Transaction date (default: now)
- `user_id` (string) - Creator Discord user ID (audit only)
- `guild_id` (string, indexed) - Discord server ID

**Relationships:**

- None

**Indexes:**

- `guild_id` - For guild isolation
- `date` - For date range queries
- `type` - For filtering expenses/income

**Currency Formatting:**

- All amounts stored as decimal
- Displayed with 2 decimal places
- Dollar sign ($) prefix

---

## 6. Schedule Management - `/schedule`

Manage events with date, time, and countdown tracking.

### Subcommands

#### `/schedule add`

Schedule an event.

**Options:**

- `event` (required, string) - Event name
- `date` (required, string) - Date in YYYY-MM-DD format
- `time` (required, string) - Time in 24-hour format (HH:MM)
- `description` (optional, string) - Event description

**Example:**

```
/schedule add event:"Team Meeting" date:"2026-01-15" time:"14:30" description:"Q1 planning"
```

**Response:**

- ✅ Embed confirming event scheduled
- Shows event name, date, time
- Displays description if provided

**Validation:**

- Date format must be YYYY-MM-DD
- Time format must be HH:MM (24-hour)
- Date and time must be valid

**Error Handling:**

- Returns error for invalid date or time format

---

#### `/schedule list`

Show events.

**Options:**

- `filter` (optional, choice) - Filter events (default: Upcoming)
  - `Upcoming` - Future events only
  - `Past` - Past events only
  - `All` - All events

**Example:**

```
/schedule list filter:"Upcoming"
```

**Response:**

- 📅 Embed with event list (up to 10 events)
- Shows event ID, name, date, time, description
- Format: `**#5** - Team Meeting\n   📅 2026-01-15 at 14:30\n   📝 Q1 planning`
- Sorted by date (ascending for upcoming, descending for past)
- Footer shows total event count if > 10

**Empty State:**

- Shows "No {filter} events found" message

---

#### `/schedule delete`

Remove an event permanently.

**Options:**

- `event_id` (required, integer) - Event ID to delete

**Example:**

```
/schedule delete event_id:5
```

**Response:**

- Text confirmation: "Event #5 has been deleted"

**Error Handling:**

- Returns error if event not found or doesn't belong to guild

---

#### `/schedule countdown`

Show countdown to an event.

**Options:**

- `event` (required, string) - Event name (partial match)

**Example:**

```
/schedule countdown event:"Team Meeting"
```

**Behavior:**

- Searches events with partial case-insensitive matching
- Returns earliest matching event (by date, then time)

**Response:**

- ⏳ Embed with countdown
- Shows event name, date, time, time remaining
- Format: "5 days, 3 hours, 15 minutes"
- Displays description if provided

**Past Events:**

- Shows "Event has passed" for past events

**Empty Results:**

- Shows "No event found matching 'Team Meeting'" message

---

#### `/schedule today`

Show today's events.

**Example:**

```
/schedule today
```

**Response:**

- 📅 Embed with today's events
- Shows events sorted by time (ascending)
- Format: `⏰ **14:30** - Team Meeting\n   📝 Q1 planning`
- Footer shows event count

**Empty State:**

- Shows "No events scheduled for today" message

---

#### `/schedule week`

Show this week's events.

**Example:**

```
/schedule week
```

**Response:**

- 📅 Embed with week's events (next 7 days)
- Events grouped by date
- Format: `**Monday, 2026-01-15**\n  • 14:30 - Team Meeting\n  • 16:00 - Code Review`
- Sorted chronologically
- Footer shows total event count

**Empty State:**

- Shows "No events scheduled for the next 7 days" message

---

### Schedule Data Model

**Database Table:** `schedules`

**Fields:**

- `id` (integer, primary key) - Auto-incrementing event ID
- `event` (string, required) - Event name
- `date` (dateonly, required) - Event date (YYYY-MM-DD)
- `time` (string, required) - Event time (HH:MM, 24-hour)
- `description` (string, nullable) - Optional description
- `user_id` (string) - Creator Discord user ID (audit only)
- `guild_id` (string, indexed) - Discord server ID
- `created_at` (datetime) - Creation timestamp

**Relationships:**

- None

**Indexes:**

- `guild_id` - For guild isolation
- `date` - For date range queries

**Date Handling:**

- Date stored as DATEONLY (no timezone issues)
- Time stored as string (24-hour format)
- Countdown calculations use JavaScript Date concatenation

---

## 7. GitHub Issues - `/issues`

Submit bug reports, feature requests, and suggestions directly to the GitHub repository from Discord. Issues are created with full context including Discord user information and timestamps.

### Command

#### `/issues`

Create a GitHub issue with title, description, and optional type classification.

**Options:**

- `title` (required, string, max 100 chars) - Brief summary of the issue
- `description` (required, string, max 2000 chars) - Detailed description of the issue
- `type` (optional, choice) - Issue classification
  - `Bug Report` - Report a bug or error
  - `Feature Request` - Suggest a new feature
  - `Question` - Ask a question
  - `Documentation` - Request documentation improvements

**Example:**

```
/issues title:"Add dark mode" description:"It would be great to have a dark theme option" type:"Feature Request"
```

**Response:**

- ✅ Success embed with issue number and GitHub link
- 🔗 Clickable "View on GitHub" button
- ➕ "Submit Another Issue" button for quick follow-up

**Issue Format:**

Issues are created in GitHub with the following structure:

```markdown
## Description

[User's description]

---

**Submitted by:** username (Discord ID: 123456789)
**Guild ID:** 987654321
**Issue Type:** feature
**Timestamp:** 2026-02-07T20:00:00.000Z
```

**Labels:**

Issues are automatically labeled based on type:

- `Bug Report` → `bug` label
- `Feature Request` → `enhancement` label
- `Question` → `question` label
- `Documentation` → `documentation` label

**Error Handling:**

The command gracefully handles various error scenarios:

- **GitHub Not Configured:** Displays setup message for administrator
- **Invalid Token:** Shows authentication error (logged privately)
- **Rate Limit:** Informs user when to retry with specific timing
- **Permission Denied:** Indicates token lacks required permissions
- **Repository Not Found:** Suggests checking configuration

**Requirements:**

- GitHub personal access token with `repo` scope
- Repository owner and name configured in environment variables
- Command only works in Discord servers (not DMs)

**Configuration:**

Add to `.env` file:

```bash
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO_OWNER=your-username
GITHUB_REPO_NAME=Bwaincell
```

**Technical Implementation:**

- GitHub API integration via `@octokit/rest`
- Singleton service pattern with initialization validation
- Comprehensive error handling for API failures
- Discord interaction deferred to prevent timeouts
- Metadata preserved in issue body (user, guild, timestamp)

**Notes:**

- Issues include full attribution (Discord username and ID)
- Guild ID included for multi-server deployments
- Issue URLs are immediately clickable in Discord
- Failed submissions show user-friendly error messages
- All errors logged to Winston (not exposed to users)

---

## 8. Random Utilities - `/random`

Generate random selections, numbers, and entertainment suggestions.

### Subcommands

#### `/random movie`

Pick a random movie.

**Example:**

```
/random movie
```

**Response:**

- 🎬 Embed with random movie selection
- Shows movie title, year, genre, IMDb rating
- Interactive buttons: View on IMDb (link), Pick Another (reroll)

**Data Source:**

- Curated list of movies stored in `backend/utils/recipeData.js`
- Movie details include: year, genre, rating, IMDb link

---

#### `/random dinner`

Pick a random dinner option.

**Example:**

```
/random dinner
```

**Response:**

- 🍽️ Embed with random dinner suggestion
- Shows dinner name, description, prep time, difficulty
- Includes recipe image
- Interactive buttons: View Recipe (link), Pick Another (reroll), Save to List

**Data Source:**

- Curated list of dinner options stored in `backend/utils/recipeData.js`
- Dinner details include: description, image, prepTime, difficulty, recipe link

**Save to List:**

- Creates list named "Saved Dinners" if it doesn't exist
- Adds dinner name to list

---

#### `/random date`

Generate a random date idea.

**Example:**

```
/random date
```

**Response:**

- 💑 Embed with random date idea
- Shows date activity name
- Interactive button: Get Another Idea (reroll)

**Data Source:**

- Hardcoded list of 16 date ideas (e.g., "Picnic in the park", "Movie night at home")

---

#### `/random question`

Get a conversation starter.

**Example:**

```
/random question
```

**Response:**

- 💭 Embed with conversation starter question
- Interactive button: Next Question (reroll)

**Data Source:**

- Hardcoded list of 15 conversation starters

---

#### `/random choice`

Pick from provided options.

**Options:**

- `options` (required, string) - Comma-separated options

**Example:**

```
/random choice options:"Pizza,Burgers,Tacos,Sushi"
```

**Response:**

- 🎲 Embed showing all options and randomly selected choice
- Format: `From: Pizza, Burgers, Tacos, Sushi\n\nI choose: **Tacos**`

**Validation:**

- Requires at least 2 options
- Trims whitespace from each option
- Filters empty options

---

#### `/random number`

Generate a random number.

**Options:**

- `max` (required, integer, ≥ 2) - Maximum value

**Example:**

```
/random number max:100
```

**Response:**

- 🔢 Embed showing range and randomly generated number
- Format: `Range: 1 - 100\n\nResult: **42**`

**Behavior:**

- Generates random integer between 1 and max (inclusive)

---

#### `/random coin`

Flip a coin.

**Example:**

```
/random coin
```

**Response:**

- 🪙 Embed showing coin flip result
- Result: Heads (👑) or Tails (⚡)
- Interactive button: Flip Again (reroll)

**Probability:**

- 50% chance for each outcome

---

#### `/random dice`

Roll dice.

**Options:**

- `sides` (required, integer, 2-100) - Number of sides
- `count` (optional, integer, 1-10) - Number of dice (default: 1)

**Example:**

```
/random dice sides:20 count:2
```

**Response:**

- 🎲 Embed showing dice roll
- Title: "Rolling 2d20"
- Single die: Shows result only
- Multiple dice: Shows individual rolls and total

**Format:**

- Single die: `Result: **15**`
- Multiple dice: `Rolls: 12, 18\nTotal: **30**`

---

### Random Data Models

**No Database Storage:**

- Random commands use in-memory data only
- Movie and dinner data stored in `backend/utils/recipeData.js`
- Date ideas and conversation starters hardcoded in command file

---

## Global Features

### Autocomplete

All commands with `autocomplete: true` provide real-time suggestions as you type:

**Tasks:**

- Shows task IDs with descriptions and due dates
- Filters pending tasks for `/task done`

**Lists:**

- Shows list names for `list_name` options
- Shows list items for `item` options

**Notes:**

- Shows note titles for `title` options
- Shows note titles for `current_title` options

**Reminders:**

- Shows reminder IDs with messages, frequency, and time

**Implementation:**

- Fetches data from database on-demand
- Filters results based on user input
- Limited to 25 results (Discord API limit)

---

### Interactive Components

**Buttons:**

- Used for quick actions (Mark as Done, Delete, Edit, etc.)
- Custom IDs encode action and target (e.g., `task_done_5`)
- Styles: Primary (blue), Success (green), Danger (red), Secondary (gray)

**Select Menus:**

- Used for quick selection from lists
- Shown when ≤25 items available
- Options include label, description, value, and emoji

**Embeds:**

- Rich formatting with title, description, fields, colors, timestamps
- Color codes: Success (green), Error (red), Info (blue), Warning (yellow)

---

### Guild Isolation

**How It Works:**

- All data filtered by `guild_id` (Discord server ID)
- Users in same server share all data (household access)
- Users in different servers have separate data

**Database Queries:**

- All queries include `WHERE guild_id = :guildId`
- Ensures cross-server data privacy

**User ID:**

- Stored for audit purposes only
- Not used for access control
- Enables future "who created this?" features

---

### Error Handling

**Common Errors:**

- "This command can only be used in a server" - Command run in DMs
- "Task #5 not found or doesn't belong to you" - Invalid ID or wrong guild
- "Invalid date format" - Date/time format validation failure
- "An error occurred while processing your request" - Generic database error

**Logging:**

- All errors logged with context (command, subcommand, user, guild, error stack)
- Uses Winston logger with structured JSON format

---

## Deployment

### Command Registration

Commands must be deployed to Discord before use:

```bash
# Deploy to guild (testing)
npm run deploy --workspace=backend

# Deploy globally (production)
# Edit deploy-commands.ts to use global deployment
```

**Command Structure:**

- Built with SlashCommandBuilder
- Subcommands for related actions
- Options with validation (required, min/max, choices)
- Autocomplete enabled where applicable

**Deployment File:**

- `backend/src/deploy-commands.ts`
- Uses Discord REST API
- Requires BOT_TOKEN and CLIENT_ID

---

## Environment Variables

Required environment variables for Discord commands:

```bash
# Discord Configuration
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_for_testing

# Database
DATABASE_URL=postgresql://user:password@localhost:5433/bwaincell

# Timezone (for reminders)
TIMEZONE=America/Chicago

# Reminder Channel (optional)
DEFAULT_REMINDER_CHANNEL=your_channel_id_for_reminders
```

---

## Permissions

**Required Bot Permissions:**

- Send Messages
- Send Messages in Threads
- Embed Links
- Attach Files
- Use Slash Commands

**Intent Requirements:**

- Guilds
- GuildMessages

---

## Troubleshooting

**Commands not appearing:**

- Ensure commands are deployed: `npm run deploy --workspace=backend`
- Check bot has "Use Slash Commands" permission
- Verify BOT_TOKEN and CLIENT_ID are correct
- Allow 1-2 hours for global commands to propagate

**Autocomplete not working:**

- Check database connection
- Verify guild_id is correct
- Ensure data exists for autocomplete

**Reminders not triggering:**

- Check scheduler is running: `npm run dev:backend`
- Verify timezone configuration
- Ensure DEFAULT_REMINDER_CHANNEL is set
- Check reminder `active` status and `next_trigger` time

**"Command can only be used in a server" error:**

- Commands require guild context (cannot be used in DMs)
- Run command in a Discord server where bot is present

---

## Support

**GitHub Issues:** [github.com/lukadfagundes/bwaincell/issues](https://github.com/lukadfagundes/bwaincell/issues)
**Documentation:** [docs/](../)

---

## 9. Recipe Management - `/recipe`

Store recipes scraped from websites/videos, generate weekly meal plans, scale servings, and produce AI-consolidated shopping lists.

Source: `backend/commands/recipe.ts`, interactions in `backend/utils/interactions/handlers/recipeHandlers.ts`.

### Subcommands

- `/recipe add link:<URL>` — Ingest a recipe from a website URL or YouTube video. Runs the two-pass ingestion pipeline (Pass 1: JSON-LD/microdata/OG scrape; Pass 2: Gemini fills remaining gaps). Returns an embed with provenance badges (🔍 source / 🤖 researched).
- `/recipe view recipe:<autocomplete> servings:<1-50>` — Display a recipe scaled to the requested serving count.
- `/recipe delete recipe:<autocomplete>` — Delete a recipe.
- `/recipe edit recipe:<autocomplete>` — Open the edit flow for a recipe.
- `/recipe search` — Filter recipes by `cuisine`, `difficulty` (easy/medium/hard), `tag` (dietary), `keyword`, and `max_prep_time`. All filters optional.
- `/recipe favorite recipe:<autocomplete>` — Toggle favorite status (favorites sort first in autocomplete and lists).
- `/recipe plan` — Start an interactive weekly meal-plan builder. Choose Pick mode or AI-suggested mode; collect 7 recipes + servings; persists to `meal_plans`.
- `/recipe swap slot:<1-7>` — Swap a slot in the active meal plan with a different recipe.
- `/recipe week` — Show the active meal plan for the current week.
- `/recipe history` — Show past (archived) meal plans.
- `/recipe preferences action:<choice> value:<string>` — Manage guild-level recipe preferences. Actions: `view`, `add_restriction`, `remove_restriction`, `add_exclusion`, `remove_exclusion`, `clear`.

### Data Models

- `recipes` — see [docs/backend/models/Recipe.md](../backend/models/Recipe.md)
- `meal_plans` — see [docs/backend/models/MealPlan.md](../backend/models/MealPlan.md)
- `recipe_preferences` — see [docs/backend/models/RecipePreferences.md](../backend/models/RecipePreferences.md)

### Interactive Components

Button / select-menu handlers live in `backend/utils/interactions/handlers/recipeHandlers.ts`. Notable custom IDs:

- `recipe_view_full_<id>` — expand full recipe embed after add
- `recipe_plan_*` — picking stage buttons/selects
- `recipe_plan_confirm_*`, `recipe_plan_servings_*` — confirmation + servings collection stages

Plan sessions are kept in an in-memory `Map<string, PlanSession>` keyed by `${guildId}:${userId}`, TTL 15 minutes.

### Example

```
/recipe add link:"https://example.com/chicken-curry"
/recipe view recipe:"Chicken Curry" servings:6
/recipe plan
/recipe swap slot:3
```

### Response

- Rich embeds with badges for cuisine, difficulty, prep/cook time, dietary tags, and nutrition (per serving).
- Favorites marked with ★ in autocomplete.
- Provenance footer shows how many fields came from the source vs. were AI-researched.

---

## 10. Local Events - `/events`

Discover local events or reconfigure the weekly announcement schedule. Events are AI-discovered via Gemini grounded on the configured location.

Source: `backend/commands/events.ts`, service `backend/utils/eventsService.ts`, model `EventConfig`.

### Options

- `day` (optional, string) — Day name to set the announcement day (e.g., `"Monday"`, `"Friday"`). Parsed via `parseDayName()`.
- `time` (optional, string) — 12-hour format time (e.g., `"2:30 PM"`). Parsed to 24-hour and stored.

### Behavior

- If either option is provided, `EventConfig.upsertConfig()` is called and the central scheduler is refreshed via `scheduler.addEventConfig(guildId)`.
- If neither option is provided, `eventsService.discoverLocalEvents(location, start, end)` runs and the resulting embed is sent.

### Environment Requirements

- `LOCATION_ZIP_CODE` — location used for discovery.
- `DEFAULT_REMINDER_CHANNEL` — channel where weekly announcements are posted.
- `TIMEZONE` (via `config.settings.timezone`) — timezone used for schedule math.
- `GEMINI_API_KEY` — required for AI discovery.

### Data Model

See [docs/backend/models/EventConfig.md](../backend/models/EventConfig.md).

### Example

```
/events                     # preview upcoming events now
/events day:Friday time:"6:00 PM"   # reschedule weekly announcement
```

---

## 11. Make it a Quote - `/make-it-a-quote`

Render a dramatic quote image from an existing Discord message.

Source: `backend/commands/quote.ts`, image rendering in `backend/utils/imageService.ts` (skia-canvas).

### Options

- `message_link` (required, string) — A Discord message link (right-click → Copy Message Link) or a plain message ID for same-channel quoting.

### Behavior

1. Parse input: if a full link is provided, extract `guildId/channelId/messageId`; otherwise treat input as a message ID in the current channel.
2. Fetch the target message (cross-channel support if linked).
3. Resolve the author's guild-specific avatar (`member.displayAvatarURL({ extension: 'png', size: 512 })`).
4. `ImageService.generateQuoteImage(avatarUrl, quoteText, username)` produces a PNG buffer.
5. Reply with attachment `quote.png`.

### Error Cases

- Message not found / bot lacks channel access.
- Cross-server link rejected.
- Empty message content rejected.
- `skia-canvas is not available` → user-facing message explaining the image library is missing for this platform.

### Example

```
/make-it-a-quote message_link:"https://discord.com/channels/123/456/789"
```

### Data Model

None — this command is stateless and writes no persistent data.

---

## 12. Sunset Announcements - `/sunset`

Schedule a daily sunset announcement delivered N minutes before local sunset.

Source: `backend/commands/sunset.ts`, service `backend/utils/sunsetService.ts`, model `SunsetConfig`.

### Subcommands

- `/sunset enable` — Enable daily announcements. Validates `LOCATION_ZIP_CODE` via `getCoordinatesFromZip()`, upserts a `SunsetConfig` row (defaults: `advance_minutes=60`, `timezone=config.settings.timezone`), and registers the job with the central scheduler (`scheduler.addSunsetConfig(guildId)`).
- `/sunset disable` — Toggles `is_enabled=false` and removes the scheduled job.
- `/sunset set minutes:<1-120>` — Update advance-notice minutes (how long before sunset the announcement fires). Refreshes scheduler.
- `/sunset status` — Show current config, today's sunset time (fetched via `getSunsetTime()` from `api.sunrise-sunset.org`), and countdown.

### Environment Requirements

- `LOCATION_ZIP_CODE` — US ZIP code used for geocoding via `api.zippopotam.us`.
- `DEFAULT_REMINDER_CHANNEL` — channel where the announcement is posted.
- `TIMEZONE` (via `config.settings.timezone`) — timezone for display + scheduling.

### Data Model

See [docs/backend/models/SunsetConfig.md](../backend/models/SunsetConfig.md).

### Example

```
/sunset enable
/sunset set minutes:30
/sunset status
/sunset disable
```

### Response

Embeds in sunset color (0xff6b35 when enabled, 0x808080/0xff0000 when disabled) with ZIP, advance notice, channel, today's sunset time, countdown, and last announcement timestamp.

---

## Changelog

**Version 2.1.0 (2026-04-15):**

- Migrated storage from Sequelize/PostgreSQL to Supabase (PostgreSQL).
- Added `/recipe` (13 subcommands): recipe ingestion, search, favorites, meal planning, preferences.
- Added `/events`: AI-powered local event discovery + weekly announcement schedule.
- Added `/make-it-a-quote`: dramatic quote image generator.
- Added `/sunset`: daily sunset announcement scheduling.
- Cross-references added to new backend model and service docs.

**Version 2.0.0 (2026-01-11):**

- Initial documentation release
- 7 commands documented: task, list, note, remind, budget, schedule, random
- Complete API reference with examples
- Data models and database schemas
- Autocomplete and interactive component documentation

---

**Last Updated:** 2026-04-15
