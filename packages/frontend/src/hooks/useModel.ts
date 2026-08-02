/**
 * @reacto/frontend — Auto-generated React hooks for model CRUD operations
 *
 * These hooks provide typed data-fetching for any Reacto model class.
 * They use fetch() against /api/{tableName} endpoints.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

import type { ModelLike } from '../types.js';

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ListOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  filters?: Record<string, string>;
}

interface UseListResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  pagination: Pagination | null;
  refetch: () => void;
}

interface UseGetResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UseCreateResult<T> {
  create: (data: Partial<T>) => Promise<T | null>;
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseUpdateResult<T> {
  update: (id: number, data: Partial<T>) => Promise<T | null>;
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseDeleteResult {
  remove: (id: number) => Promise<boolean>;
  loading: boolean;
  error: Error | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBaseUrl(modelClass: ModelLike): string {
  return `/api/${modelClass.tableName}`;
}

// ─── useList ──────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of records for a model.
 */
export function useList<T = Record<string, unknown>>(
  modelClass: ModelLike,
  options?: ListOptions
): UseListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', String(options.page));
      if (options?.pageSize) params.set('pageSize', String(options.pageSize));
      if (options?.orderBy) params.set('orderBy', options.orderBy);
      if (options?.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          params.set(key, value);
        }
      }

      const url = `${getBaseUrl(modelClass)}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as { data: T[]; pagination?: Pagination };

      if (currentRequestId === requestIdRef.current) {
        setData(result.data);
        setPagination(result.pagination ?? null);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [modelClass.tableName, options?.page, options?.pageSize, options?.orderBy, JSON.stringify(options?.filters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, pagination, refetch: fetchData };
}

// ─── useGet ───────────────────────────────────────────────────────────────────

/**
 * Fetch a single record by ID.
 */
export function useGet<T = Record<string, unknown>>(
  modelClass: ModelLike,
  id: number | null
): UseGetResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (id === null) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getBaseUrl(modelClass)}/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setData(null);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as { data: T };
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [modelClass.tableName, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ─── useCreate ────────────────────────────────────────────────────────────────

/**
 * Create a new record.
 */
export function useCreate<T = Record<string, unknown>>(
  modelClass: ModelLike
): UseCreateResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (formData: Partial<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getBaseUrl(modelClass), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as { data: T };
      const created = result.data;
      setData(created);
      return created;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [modelClass.tableName]);

  return { create, data, loading, error };
}

// ─── useUpdate ────────────────────────────────────────────────────────────────

/**
 * Update an existing record.
 */
export function useUpdate<T = Record<string, unknown>>(
  modelClass: ModelLike
): UseUpdateResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (id: number, formData: Partial<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getBaseUrl(modelClass)}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as { data: T };
      const updated = result.data;
      setData(updated);
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [modelClass.tableName]);

  return { update, data, loading, error };
}

// ─── useDelete ────────────────────────────────────────────────────────────────

/**
 * Delete a record by ID.
 */
export function useDelete(
  modelClass: ModelLike
): UseDeleteResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getBaseUrl(modelClass)}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setLoading(false);
    }
  }, [modelClass.tableName]);

  return { remove, loading, error };
}
