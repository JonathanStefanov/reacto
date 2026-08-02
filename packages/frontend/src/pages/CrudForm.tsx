/**
 * @reacto/frontend — Generic CRUD form component
 *
 * Auto-generates form fields from model definition.
 * Handles both create (POST) and update (PUT) operations.
 */
import React, { useState, useEffect } from 'react';
import { useCreate, useUpdate, useGet } from '../hooks/useModel.js';

import type { ModelLike } from '../types.js';

interface CrudFormProps {
  modelClass: ModelLike;
  recordId?: number | null;
  onSuccess?: (record: Record<string, unknown>) => void;
  onCancel?: () => void;
}

interface FieldError {
  field: string;
  message: string;
}

/**
 * Auto-generated form for creating or editing a model record.
 */
export function CrudForm({
  modelClass,
  recordId = null,
  onSuccess,
  onCancel,
}: CrudFormProps): React.ReactElement {
  const isEdit = recordId !== null && recordId !== undefined;
  const { data: existingRecord, loading: loadingRecord } = useGet<Record<string, unknown>>(
    modelClass,
    isEdit ? recordId : null
  );
  const { create, loading: creating, error: createError } = useCreate(modelClass);
  const { update, loading: updating, error: updateError } = useUpdate(modelClass);

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [validationErrors, setValidationErrors] = useState<FieldError[]>([]);

  const fieldEntries = Array.from(modelClass.fields.entries()).filter(
    ([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt'
  );

  // Populate form when editing
  useEffect(() => {
    if (existingRecord) {
      const initial: Record<string, unknown> = {};
      for (const [key] of fieldEntries) {
        initial[key] = existingRecord[key] ?? '';
      }
      setFormData(initial);
    }
  }, [existingRecord]);

  const loading = creating || updating;
  const error = createError || updateError;

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => prev.filter((e) => e.field !== field));
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(field, e.target.value);
  };

  const validate = (): boolean => {
    const errors: FieldError[] = [];
    for (const [key, fieldDef] of fieldEntries) {
      const value = formData[key];
      if (!fieldDef.nullable && !fieldDef.default && (value === '' || value === undefined || value === null)) {
        errors.push({ field: key, message: `${key} is required` });
      }
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cleaned = { ...formData };
    // Convert empty strings to null for nullable fields
    for (const [key, fieldDef] of fieldEntries) {
      if (cleaned[key] === '' && fieldDef.nullable) {
        cleaned[key] = null;
      }
    }

    let result: Record<string, unknown> | null = null;
    if (isEdit && recordId) {
      result = await update(recordId, cleaned);
    } else {
      result = await create(cleaned);
    }

    if (result) {
      onSuccess?.(result);
    }
  };

  if (isEdit && loadingRecord) {
    return <div className="reacto-loading">Loading record...</div>;
  }

  return (
    <form className="reacto-crud-form" onSubmit={handleSubmit}>
      <h2>{isEdit ? `Edit ${modelClass._modelName}` : `Create ${modelClass._modelName}`}</h2>

      {error && (
        <div className="reacto-error">
          <p>{error.message}</p>
        </div>
      )}

      {fieldEntries.map(([key, fieldDef]) => {
        const fieldError = validationErrors.find((e) => e.field === key);
        return (
          <div key={key} className="reacto-form-field">
            <label htmlFor={`field-${key}`}>
              {key}
              {!fieldDef.nullable && !fieldDef.default && <span className="reacto-required">*</span>}
            </label>
            <input
              id={`field-${key}`}
              type={getInputType(fieldDef.type)}
              value={(formData[key] as string) ?? ''}
              onChange={handleInputChange(key)}
              className={fieldError ? 'reacto-field-error' : undefined}
            />
            {fieldError && <span className="reacto-field-error-msg">{fieldError.message}</span>}
          </div>
        );
      })}

      <div className="reacto-form-actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function getInputType(fieldType?: string): string {
  switch (fieldType) {
    case 'integer':
    case 'bigInteger':
    case 'float':
    case 'decimal':
      return 'number';
    case 'boolean':
      return 'checkbox';
    case 'date':
    case 'datetime':
      return 'date';
    case 'email':
      return 'email';
    case 'url':
      return 'url';
    default:
      return 'text';
  }
}
