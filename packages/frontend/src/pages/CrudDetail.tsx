/**
 * @reacto-org/frontend — Generic CRUD detail view
 *
 * Displays a single record for any model.
 */
import React from 'react';
import { useGet, useDelete } from '../hooks/useModel.js';

import type { ModelLike } from '../types.js';

interface CrudDetailProps {
  modelClass: ModelLike;
  recordId: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

/**
 * Detail view for a single model record.
 */
export function CrudDetail({
  modelClass,
  recordId,
  onEdit,
  onDelete,
  onBack,
}: CrudDetailProps): React.ReactElement {
  const { data, loading, error } = useGet<Record<string, unknown>>(modelClass, recordId);
  const { remove, loading: deleting } = useDelete(modelClass);

  const fieldNames = Array.from(modelClass.fields.keys());

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete this ${modelClass._modelName}?`)) {
      const success = await remove(recordId);
      if (success) {
        onDelete?.();
      }
    }
  };

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

  if (!data) {
    return (
      <div className="reacto-not-found">
        <h3>{modelClass._modelName} not found</h3>
        <p>No record with ID {recordId}.</p>
      </div>
    );
  }

  return (
    <div className="reacto-crud-detail">
      <h2>{modelClass._modelName} #{recordId}</h2>

      <table className="reacto-detail-table">
        <tbody>
          {fieldNames.map((field) => (
            <tr key={field}>
              <th>{field}</th>
              <td>{formatValue(data[field])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="reacto-detail-actions">
        {onBack && (
          <button type="button" onClick={onBack}>
            Back
          </button>
        )}
        {onEdit && (
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}
