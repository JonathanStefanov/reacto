/**
 * @reacto/frontend — Admin panel
 *
 * Composes sidebar navigation, list/detail/create/edit views
 * for all registered models. Uses a simple hash-based router.
 */
import React, { useState, useCallback } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { CrudList } from '../pages/CrudList.js';
import { CrudForm } from '../pages/CrudForm.js';
import { CrudDetail } from '../pages/CrudDetail.js';

import type { ModelLike } from '../types.js';

interface AdminPanelProps {
  models: ModelLike[];
  basePath?: string;
}

type ViewType = 'list' | 'create' | 'edit' | 'detail';

interface ViewState {
  modelName: string;
  view: ViewType;
  recordId?: number;
  page: number;
}

/**
 * Full admin panel with sidebar navigation and CRUD views.
 */
export function AdminPanel({ models, basePath = '/admin' }: AdminPanelProps): React.ReactElement {
  const [viewState, setViewState] = useState<ViewState>({
    modelName: models[0]?._modelName ?? '',
    view: 'list',
    page: 1,
  });

  const getModel = useCallback(
    (name: string) => models.find((m) => m._modelName === name),
    [models]
  );

  const currentModel = getModel(viewState.modelName);

  const navigateToList = useCallback((page = 1) => {
    setViewState((prev) => ({ ...prev, view: 'list', recordId: undefined, page }));
  }, []);

  const navigateToCreate = useCallback(() => {
    setViewState((prev) => ({ ...prev, view: 'create', recordId: undefined }));
  }, []);

  const navigateToDetail = useCallback((id: number) => {
    setViewState((prev) => ({ ...prev, view: 'detail', recordId: id }));
  }, []);

  const navigateToEdit = useCallback((id: number) => {
    setViewState((prev) => ({ ...prev, view: 'edit', recordId: id }));
  }, []);

  const switchModel = useCallback((name: string) => {
    setViewState({ modelName: name, view: 'list', page: 1 });
  }, []);

  if (!currentModel) {
    return <div className="reacto-error">No models registered.</div>;
  }

  // ─── Sidebar ────────────────────────────────────────────────────────────

  const sidebar = (
    <div className="reacto-admin-nav">
      <h1 className="reacto-admin-title">Reacto Admin</h1>
      <nav>
        <ul className="reacto-model-list">
          {models.map((model) => (
            <li
              key={model._modelName}
              className={`reacto-model-item ${model._modelName === viewState.modelName ? 'active' : ''}`}
            >
              <button type="button" onClick={() => switchModel(model._modelName)}>
                {model._modelName}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  // ─── Content ────────────────────────────────────────────────────────────

  let content: React.ReactNode;

  switch (viewState.view) {
    case 'list':
      content = (
        <>
          <div className="reacto-list-header">
            <h2>{currentModel._modelName}</h2>
            <button type="button" onClick={navigateToCreate}>
              + Create {currentModel._modelName}
            </button>
          </div>
          <CrudList
            modelClass={currentModel}
            page={viewState.page}
            onRowClick={(item) => navigateToDetail(item.id as number)}
            onPageChange={(page) => navigateToList(page)}
          />
        </>
      );
      break;

    case 'create':
      content = (
        <CrudForm
          modelClass={currentModel}
          onSuccess={() => navigateToList()}
          onCancel={() => navigateToList()}
        />
      );
      break;

    case 'edit':
      content = (
        <CrudForm
          modelClass={currentModel}
          recordId={viewState.recordId}
          onSuccess={() => navigateToList()}
          onCancel={() => navigateToList()}
        />
      );
      break;

    case 'detail':
      content = (
        <CrudDetail
          modelClass={currentModel}
          recordId={viewState.recordId!}
          onEdit={() => navigateToEdit(viewState.recordId!)}
          onDelete={() => navigateToList()}
          onBack={() => navigateToList()}
        />
      );
      break;
  }

  return <AdminLayout sidebar={sidebar}>{content}</AdminLayout>;
}
