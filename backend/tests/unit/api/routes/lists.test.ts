/**
 * Unit tests for /api/lists Express route handlers
 *
 * Tests all CRUD operations for lists and list items via the REST API.
 * Uses supertest with a mini Express app to test route handlers.
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@database/index', () => ({
  List: {
    getUserLists: jest.fn(),
    getList: jest.fn(),
    createList: jest.fn(),
    addItem: jest.fn(),
    toggleItem: jest.fn(),
    removeItem: jest.fn(),
    clearCompleted: jest.fn(),
    deleteList: jest.fn(),
  },
}));

import { List } from '@database/index';
import express from 'express';
import listsRouter from '../../../../src/api/routes/lists';
import request from 'supertest';

const mockList = List as jest.Mocked<typeof List>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = {
      discordId: 'discord-123',
      guildId: 'guild-123',
      email: 'test@test.com',
      googleId: 'google-123',
      name: 'Test User',
    };
    next();
  });
  app.use('/lists', listsRouter);
  return app;
}

describe('Lists API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  // ─── GET /lists ───────────────────────────────────────────────────

  describe('GET /lists', () => {
    it('should return all lists for the user', async () => {
      const fakeLists = [
        { id: 1, name: 'Groceries', items: [] },
        { id: 2, name: 'Todo', items: [] },
      ];
      mockList.getUserLists.mockResolvedValue(fakeLists as any);

      const res = await request(app).get('/lists');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeLists);
      expect(mockList.getUserLists).toHaveBeenCalledWith('guild-123');
    });

    it('should handle server errors', async () => {
      mockList.getUserLists.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/lists');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /lists/:name ─────────────────────────────────────────────

  describe('GET /lists/:name', () => {
    it('should return a list by name', async () => {
      const fakeList = { id: 1, name: 'Groceries', items: ['Milk', 'Bread'] };
      mockList.getList.mockResolvedValue(fakeList as any);

      const res = await request(app).get('/lists/Groceries');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeList);
      expect(mockList.getList).toHaveBeenCalledWith('guild-123', 'Groceries');
    });

    it('should return 404 when list is not found', async () => {
      mockList.getList.mockResolvedValue(null as any);

      const res = await request(app).get('/lists/Nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('List not found');
    });

    it('should handle URL-encoded list names', async () => {
      const fakeList = { id: 1, name: 'Shopping List', items: [] };
      mockList.getList.mockResolvedValue(fakeList as any);

      const res = await request(app).get('/lists/Shopping%20List');

      expect(res.status).toBe(200);
      expect(mockList.getList).toHaveBeenCalledWith('guild-123', 'Shopping List');
    });

    it('should handle server errors', async () => {
      mockList.getList.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/lists/Test');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /lists ──────────────────────────────────────────────────

  describe('POST /lists', () => {
    it('should create a new list', async () => {
      const createdList = { id: 1, name: 'New List', items: [] };
      mockList.createList.mockResolvedValue(createdList as any);

      const res = await request(app).post('/lists').send({ name: 'New List' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(createdList);
      expect(mockList.createList).toHaveBeenCalledWith('guild-123', 'New List', 'discord-123');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app).post('/lists').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Name is required');
    });

    it('should return 400 when name is not a string', async () => {
      const res = await request(app).post('/lists').send({ name: 123 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Name is required');
    });

    it('should return 400 when name is empty', async () => {
      const res = await request(app).post('/lists').send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Name cannot be empty');
    });

    it('should return 400 when list with same name already exists', async () => {
      mockList.createList.mockResolvedValue(null as any);

      const res = await request(app).post('/lists').send({ name: 'Existing' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('list with this name already exists');
    });

    it('should handle server errors', async () => {
      mockList.createList.mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/lists').send({ name: 'Test' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /lists/:name/items ──────────────────────────────────────

  describe('POST /lists/:name/items', () => {
    it('should add an item to a list', async () => {
      const updatedList = { id: 1, name: 'Groceries', items: [{ text: 'Milk', completed: false }] };
      mockList.addItem.mockResolvedValue(updatedList as any);

      const res = await request(app).post('/lists/Groceries/items').send({ item: 'Milk' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(updatedList);
      expect(mockList.addItem).toHaveBeenCalledWith('guild-123', 'Groceries', 'Milk');
    });

    it('should return 400 when item is missing', async () => {
      const res = await request(app).post('/lists/Groceries/items').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Item is required');
    });

    it('should return 400 when item is not a string', async () => {
      const res = await request(app).post('/lists/Groceries/items').send({ item: 123 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Item is required');
    });

    it('should return 400 when item is empty', async () => {
      const res = await request(app).post('/lists/Groceries/items').send({ item: '  ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Item cannot be empty');
    });

    it('should return 404 when list is not found', async () => {
      mockList.addItem.mockResolvedValue(null as any);

      const res = await request(app).post('/lists/Nonexistent/items').send({ item: 'Milk' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('List not found');
    });

    it('should handle server errors', async () => {
      mockList.addItem.mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/lists/Test/items').send({ item: 'Item' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /lists/:name/items/:itemText/toggle ────────────────────

  describe('PATCH /lists/:name/items/:itemText/toggle', () => {
    it('should toggle a list item', async () => {
      const updatedList = {
        id: 1,
        name: 'Groceries',
        items: [{ text: 'Milk', completed: true }],
      };
      mockList.toggleItem.mockResolvedValue(updatedList as any);

      const res = await request(app).patch('/lists/Groceries/items/Milk/toggle');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(updatedList);
      expect(mockList.toggleItem).toHaveBeenCalledWith('guild-123', 'Groceries', 'Milk');
    });

    it('should return 404 when list or item is not found', async () => {
      mockList.toggleItem.mockResolvedValue(null as any);

      const res = await request(app).patch('/lists/Groceries/items/Unknown/toggle');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('List or item not found');
    });

    it('should handle URL-encoded item text', async () => {
      const updatedList = { id: 1, name: 'List', items: [] };
      mockList.toggleItem.mockResolvedValue(updatedList as any);

      const res = await request(app).patch('/lists/List/items/Buy%20eggs/toggle');

      expect(res.status).toBe(200);
      expect(mockList.toggleItem).toHaveBeenCalledWith('guild-123', 'List', 'Buy eggs');
    });

    it('should handle server errors', async () => {
      mockList.toggleItem.mockRejectedValue(new Error('DB error'));

      const res = await request(app).patch('/lists/Test/items/Item/toggle');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /lists/:name/items/:itemText ──────────────────────────

  describe('DELETE /lists/:name/items/:itemText', () => {
    it('should remove an item from a list', async () => {
      const updatedList = { id: 1, name: 'Groceries', items: [] };
      mockList.removeItem.mockResolvedValue(updatedList as any);

      const res = await request(app).delete('/lists/Groceries/items/Milk');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockList.removeItem).toHaveBeenCalledWith('guild-123', 'Groceries', 'Milk');
    });

    it('should return 404 when list or item is not found', async () => {
      mockList.removeItem.mockResolvedValue(null as any);

      const res = await request(app).delete('/lists/Groceries/items/Unknown');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('List or item not found');
    });

    it('should handle URL-encoded item text', async () => {
      const updatedList = { id: 1, name: 'List', items: [] };
      mockList.removeItem.mockResolvedValue(updatedList as any);

      const res = await request(app).delete('/lists/List/items/Buy%20eggs');

      expect(res.status).toBe(200);
      expect(mockList.removeItem).toHaveBeenCalledWith('guild-123', 'List', 'Buy eggs');
    });

    it('should handle server errors', async () => {
      mockList.removeItem.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/lists/Test/items/Item');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /lists/:name/clear-completed ────────────────────────────

  describe('POST /lists/:name/clear-completed', () => {
    it('should clear completed items from a list', async () => {
      const updatedList = {
        id: 1,
        name: 'Groceries',
        items: [{ text: 'Milk', completed: false }],
      };
      mockList.clearCompleted.mockResolvedValue(updatedList as any);

      const res = await request(app).post('/lists/Groceries/clear-completed');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(updatedList);
      expect(mockList.clearCompleted).toHaveBeenCalledWith('guild-123', 'Groceries');
    });

    it('should return 404 when list is not found', async () => {
      mockList.clearCompleted.mockResolvedValue(null as any);

      const res = await request(app).post('/lists/Nonexistent/clear-completed');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('List not found');
    });

    it('should handle server errors', async () => {
      mockList.clearCompleted.mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/lists/Test/clear-completed');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /lists/:name ──────────────────────────────────────────

  describe('DELETE /lists/:name', () => {
    it('should delete a list successfully', async () => {
      mockList.deleteList.mockResolvedValue(true as any);

      const res = await request(app).delete('/lists/Groceries');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('List deleted successfully');
      expect(mockList.deleteList).toHaveBeenCalledWith('guild-123', 'Groceries');
    });

    it('should return 404 when list is not found', async () => {
      mockList.deleteList.mockResolvedValue(false as any);

      const res = await request(app).delete('/lists/Nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('List not found');
    });

    it('should handle URL-encoded list names', async () => {
      mockList.deleteList.mockResolvedValue(true as any);

      const res = await request(app).delete('/lists/Shopping%20List');

      expect(res.status).toBe(200);
      expect(mockList.deleteList).toHaveBeenCalledWith('guild-123', 'Shopping List');
    });

    it('should handle server errors', async () => {
      mockList.deleteList.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/lists/Test');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
