/**
 * @reacto/frontend — Generic CRUD list component
 *
 * Renders a table for any model with auto-discovered fields,
 * pagination, loading, and error states.
 */
import React from 'react';
import { useList } from '../hooks/useModel.js';

import type { ModelLike } from '../types.js';

interface CrudListProps {
  modelClass: ModelLike;
  title?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  filters?: Record<string, string>;
  onRowClick?: (item: Record<string, unknown>) => void;
  onPageChange?: (page: number) => void;
}

/**
 * Auto-generated list view for any Reacto model.
 * Renders a table with columns for each field.
 */
export function CrudList({
  modelClass,
  title,
  page = 1,
  pageSize = 20,
  orderBy,
  filters,
  onRowClick,
  onPageChange,
}: CrudListProps): React.ReactElement {
  const { data, loading, error, pagination } = useList<Record<string, unknown>>(
    modelClass,
    { page, pageSize, orderBy, filters }
  );

  const fieldNames = Array.from(modelClass.fields.keys());

  if (loading) {
    return <div className="reacto-loading">Loading {modelClass._modelName}...</div>;
  }

  if (error) {
    return (
      <div className="reacto-error">
        <h3>Error loading {modelClass._modelName}</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="reacto-crud-list">
      {title && <h2>{title}</h2>}

      <table className="reacto-table">
        <thead>
          <tr>
            {fieldNames.map((field) => (
              <th key={field}>{field}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={fieldNames.length} className="reacto-empty">
                No records found.
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={(item as Record<string, unknown>).id as React.Key ?? index}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? 'reacto-clickable' : undefined}
              >
                {fieldNames.map((field) => (
                  <td key={field}>{formatValue(item[field])}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 && (
        <div className="reacto-pagination">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => onPageChange?.(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
