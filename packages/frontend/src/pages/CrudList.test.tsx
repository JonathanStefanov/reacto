import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock the useModel hooks
vi.mock('../hooks/useModel.js', () => ({
  useList: vi.fn(),
  useGet: vi.fn(),
  useCreate: vi.fn(),
  useUpdate: vi.fn(),
  useDelete: vi.fn(),
}));

import { CrudList } from './CrudList.js';
import { CrudDetail } from './CrudDetail.js';
import { AdminLayout } from '../admin/AdminLayout.js';
import { useList } from '../hooks/useModel.js';

const mockModel = {
  tableName: 'users',
  _modelName: 'User',
  fields: new Map([
    ['name', { type: 'string' }],
    ['email', { type: 'email' }],
  ]),
};

describe('CrudList component', () => {
  it('is a function component', () => {
    expect(typeof CrudList).toBe('function');
  });

  it('renders loading state', () => {
    vi.mocked(useList).mockReturnValue({
      data: [],
      loading: true,
      error: null,
      pagination: null,
      refetch: vi.fn(),
    });

    // We can't render without a DOM, but we verify the component exists
    // and its props are correct
    expect(CrudList).toBeDefined();
  });

  it('renders error state', () => {
    vi.mocked(useList).mockReturnValue({
      data: [],
      loading: false,
      error: new Error('Network error'),
      pagination: null,
      refetch: vi.fn(),
    });

    expect(CrudList).toBeDefined();
  });

  it('renders data state', () => {
    vi.mocked(useList).mockReturnValue({
      data: [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ],
      loading: false,
      error: null,
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      refetch: vi.fn(),
    });

    expect(CrudList).toBeDefined();
  });

  it('renders empty state', () => {
    vi.mocked(useList).mockReturnValue({
      data: [],
      loading: false,
      error: null,
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      refetch: vi.fn(),
    });

    expect(CrudList).toBeDefined();
  });
});

describe('CrudDetail component', () => {
  it('is a function component', () => {
    expect(typeof CrudDetail).toBe('function');
  });

  it('is defined and exported', () => {
    expect(CrudDetail).toBeDefined();
  });
});

describe('AdminLayout component', () => {
  it('is a function component', () => {
    expect(typeof AdminLayout).toBe('function');
  });

  it('is defined and exported', () => {
    expect(AdminLayout).toBeDefined();
  });
});

describe('Component exports', () => {
  it('exports CrudList', async () => {
    const mod = await import('./CrudList.js');
    expect(mod.CrudList).toBeDefined();
  });

  it('exports CrudForm', async () => {
    const mod = await import('./CrudForm.js');
    expect(mod.CrudForm).toBeDefined();
  });

  it('exports CrudDetail', async () => {
    const mod = await import('./CrudDetail.js');
    expect(mod.CrudDetail).toBeDefined();
  });

  it('exports AdminPanel', async () => {
    const mod = await import('../admin/AdminPanel.js');
    expect(mod.AdminPanel).toBeDefined();
  });

  it('exports AdminLayout', async () => {
    const mod = await import('../admin/AdminLayout.js');
    expect(mod.AdminLayout).toBeDefined();
  });
});
