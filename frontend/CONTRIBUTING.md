# Contributing to Bwain.app

Thank you for your interest in contributing to Bwain.app! This document provides guidelines for contributing to the Progressive Web App frontend.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment for all contributors.

---

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. Check existing issues to avoid duplicates
2. Test on multiple browsers (Chrome, Safari, Firefox)
3. Try reproducing in both browser and PWA mode (iOS/Android)
4. Collect relevant information (browser, OS, screenshots)

When creating a bug report, include:

- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Browser and OS details
- Screenshots or screen recordings
- Console errors (DevTools)

### Suggesting Features

Feature requests are welcome! Please:

1. Check if the feature has already been suggested
2. Provide a clear description of the feature
3. Explain the use case and user benefits
4. Consider mobile/PWA implications

### Pull Requests

1. **Fork the repository**

   ```bash
   git clone https://github.com/yourusername/bwaincell-pwa.git
   cd bwaincell-pwa
   ```

2. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the code style guidelines below
   - Test on multiple browsers
   - Ensure responsive design (mobile-first)
   - Check accessibility (WCAG 2.1 AA)

4. **Test your changes**

   ```bash
   npm run lint
   npm run build
   ```

5. **Commit your changes**

   ```bash
   git commit -m "feat: add your feature description"
   ```

   Use conventional commit messages:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` UI/styling changes
   - `refactor:` Code refactoring
   - `test:` Test updates
   - `chore:` Maintenance tasks

6. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Provide a clear title and description
   - Include screenshots for UI changes
   - Reference any related issues
   - Test on Safari iOS if possible

---

## Development Setup

### Prerequisites

- Node.js 18.0 or higher
- npm 9.0 or higher
- Git
- Google OAuth 2.0 Credentials (optional for local development)
- Access to backend API (local or production)

### Installation

```bash
# Clone your fork
git clone https://github.com/yourusername/bwaincell-pwa.git
cd bwaincell-pwa

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local
nano .env.local

# Start development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Define proper types (avoid `any`)
- Use interfaces for component props
- Export types when shared across files

Example:

```typescript
interface TaskItemProps {
  task: Task;
  onUpdate: (id: number, data: Partial<Task>) => void;
  onDelete: (id: number) => void;
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  // Component code
}
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper prop destructuring

Example:

```typescript
'use client';

import { useState } from 'react';

export function MyComponent() {
  const [state, setState] = useState(initialValue);

  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### Formatting

- Use Prettier (runs automatically)
- 2 spaces for indentation
- Semicolons required
- Single quotes for strings
- Tailwind CSS for styling

### Linting

```bash
npm run lint
```

Fix ESLint errors before committing.

---

## Styling Guidelines

### Tailwind CSS

- Use Tailwind utility classes
- Follow mobile-first approach
- Use responsive breakpoints: `sm:`, `md:`, `lg:`
- Stick to design system colors (twilight, dusk, dawn)

Example:

```tsx
<div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
  <Button className="bg-dawn-500 hover:bg-dawn-600 text-white">Click Me</Button>
</div>
```

### Design System Colors

- **Twilight**: `#e84d8a` - Primary brand
- **Dusk**: `#6366f1` - Secondary accents
- **Dawn**: `#f59e0b` - CTAs

### Accessibility

- Use semantic HTML elements
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain color contrast ratios (WCAG 2.1 AA)

Example:

```tsx
<button aria-label="Delete task" className="...">
  <Trash2 className="w-4 h-4" />
  <span className="sr-only">Delete</span>
</button>
```

---

## Component Development

### shadcn/ui Components

This project uses [shadcn/ui](https://ui.shadcn.com/) components. To add new ones:

```bash
npx shadcn-ui@latest add button
```

### Custom Components

1. Create in appropriate directory (`components/tasks/`, etc.)
2. Follow existing naming patterns
3. Include TypeScript types
4. Add JSDoc comments for complex logic

### State Management

- Use TanStack Query for server state
- Use React hooks for local state
- Keep state as close to usage as possible

Example:

```typescript
import { useTasks } from '@/hooks/useTasks';

export function TaskList() {
  const { tasks, isLoading, createTask, updateTask } = useTasks();

  // Component logic
}
```

---

## Testing Browsers

Test your changes on:

### Desktop

-  Chrome (latest)
-  Safari (latest)
-  Firefox (latest)
-  Edge (latest)

### Mobile

-  Safari iOS (14+)
-  Chrome Android (latest)

### PWA Mode

-  iOS "Add to Home Screen"
-  Android "Install app"
-  Desktop installation

---

## PWA Development

### Service Worker

- Service worker is auto-generated by `next-pwa`
- Don't modify `public/sw.js` directly
- Configure caching in `next.config.mjs`

### Manifest

- Edit `public/manifest.json` for PWA settings
- Update icons in `public/` directory
- Test installation on all platforms

### Offline Support

- Static assets are cached automatically
- API requests require network
- Consider offline UX for failed requests

---

## Performance

### Optimization Checklist

- [ ] Images optimized (use `next/image`)
- [ ] Code splitting (dynamic imports where appropriate)
- [ ] No unnecessary re-renders
- [ ] Debounce user inputs
- [ ] Lazy load non-critical components

### Bundle Size

Keep an eye on bundle size:

```bash
npm run build
```

Check the output for large bundles.

---

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `style/ui-improvement` - UI/styling changes
- `docs/documentation-update` - Documentation
- `refactor/code-improvement` - Refactoring

### Commit Messages

Follow conventional commits:

```
<type>(<scope>): <subject>
```

Example:

```
feat(tasks): add task completion toggle
fix(auth): resolve Safari OAuth redirect issue
style(dashboard): improve mobile responsiveness
```

---

## Deployment

### Vercel Deployment

This project deploys automatically to Vercel on push to `main`.

For manual deployment:

```bash
npm run build
vercel deploy --prod
```

### Environment Variables

Set these in Vercel dashboard:

- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

---

## Documentation

### Component Documentation

Document complex components with JSDoc:

```typescript
/**
 * Task item component with completion toggle
 * @param task - Task object with id, description, completed
 * @param onUpdate - Callback when task is updated
 * @param onDelete - Callback when task is deleted
 */
export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  // Component code
}
```

### README Updates

Update README.md when:

- Adding new features
- Changing setup instructions
- Updating dependencies
- Fixing browser compatibility issues

---

## Need Help?

- **Issues**: [GitHub Issues](https://github.com/lukadfagundes/bwaincell-pwa/issues)
- **Discussions**: Use GitHub Discussions for questions
- **Backend Docs**: See Bwaincell repository for API docs

---

## License

By contributing to Bwain.app, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Bwain.app!** (

_Same Fweak, Same Bwaincell_
