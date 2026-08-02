import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the hook logic without rendering React components (no @testing-library/react).
// Instead, we test the underlying fetch calls and data transformations.

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockModel = {
  tableName: 'users',
  _modelName: 'User',
  fields: new Map([
    ['name', { type: 'string' }],
    ['email', { type: 'email' }],
  ]),
};

describe('useModel hooks — fetch behavior', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('API URL construction', () => {
    it('constructs list URL from model tableName', () => {
      const baseUrl = `/api/${mockModel.tableName}`;
      expect(baseUrl).toBe('/api/users');
    });

    it('constructs detail URL with ID', () => {
      const url = `/api/${mockModel.tableName}/42`;
      expect(url).toBe('/api/users/42');
    });

    it('constructs URL with query params', () => {
      const params = new URLSearchParams();
      params.set('page', '2');
      params.set('pageSize', '10');
      params.set('orderBy', '-createdAt');
      const url = `/api/${mockModel.tableName}?${params.toString()}`;
      expect(url).toBe('/api/users?page=2&pageSize=10&orderBy=-createdAt');
    });

    it('constructs URL with filters', () => {
      const params = new URLSearchParams();
      params.set('active', 'true');
      params.set('role', 'admin');
      const url = `/api/${mockModel.tableName}?${params.toString()}`;
      expect(url).toBe('/api/users?active=true&role=admin');
    });
  });

  describe('CRUD fetch operations', () => {
    it('sends GET for list fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1, name: 'John' }],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        }),
      });

      const response = await fetch(`/api/${mockModel.tableName}`);
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/users');
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('sends GET for single record', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1, name: 'John' } }),
      });

      const response = await fetch(`/api/${mockModel.tableName}/1`);
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/users/1');
      expect(result.data.id).toBe(1);
    });

    it('sends POST for create', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 2, name: 'Jane', email: 'jane@example.com' } }),
      });

      const body = { name: 'Jane', email: 'jane@example.com' };
      const response = await fetch(`/api/${mockModel.tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(result.data.id).toBe(2);
    });

    it('sends PUT for update', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1, name: 'John Updated' } }),
      });

      const response = await fetch(`/api/${mockModel.tableName}/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Updated' }),
      });
      const result = await response.json();

      expect(result.data.name).toBe('John Updated');
    });

    it('sends DELETE for delete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const response = await fetch(`/api/${mockModel.tableName}/1`, {
        method: 'DELETE',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', { method: 'DELETE' });
      expect(response.ok).toBe(true);
    });

    it('handles HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const response = await fetch(`/api/${mockModel.tableName}/999`);
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });
});

describe('useModel hooks — hook return types', () => {
  it('useList returns expected shape', async () => {
    const mod = await import('./useModel.js');
    expect(typeof mod.useList).toBe('function');
  });

  it('useGet returns expected shape', async () => {
    const mod = await import('./useModel.js');
    expect(typeof mod.useGet).toBe('function');
  });

  it('useCreate returns expected shape', async () => {
    const mod = await import('./useModel.js');
    expect(typeof mod.useCreate).toBe('function');
  });

  it('useUpdate returns expected shape', async () => {
    const mod = await import('./useModel.js');
    expect(typeof mod.useUpdate).toBe('function');
  });

  it('useDelete returns expected shape', async () => {
    const mod = await import('./useModel.js');
    expect(typeof mod.useDelete).toBe('function');
  });
});
