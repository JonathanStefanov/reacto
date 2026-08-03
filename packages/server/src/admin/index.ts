/**
 * @reacto/server — Admin Dashboard
 *
 * Auto-generates an admin dashboard at /admin with:
 *   - GET /api/_admin/meta — Model metadata (fields, types, relations)
 *   - GET /admin — Admin UI (SPA with auto-generated CRUD)
 *
 * The admin UI uses React components from @reacto/frontend/AdminPanel.
 */
import { Router, Request, Response } from 'express';
import { getAllModels } from '@reacto/core';
import type { ModelClass, FieldDefinition, RelationDefinition } from '@reacto/core';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminFieldMeta {
  name: string;
  type: string;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  nullable?: boolean;
  default?: unknown;
  maxLength?: number;
  choices?: Record<string, unknown> | unknown[];
  verboseName?: string;
  helpText?: string;
}

interface AdminRelationMeta {
  name: string;
  type: string;
  target: string;
  foreignKey: string;
  inverseSide?: string;
  onDelete?: string;
  nullable?: boolean;
}

interface AdminModelMeta {
  name: string;
  tableName: string;
  verboseName?: string;
  verboseNamePlural?: string;
  fields: AdminFieldMeta[];
  relations: AdminRelationMeta[];
  fieldCount: number;
  ordering?: string[];
}

// ─── Admin API Routes ─────────────────────────────────────────────────────────

/**
 * Create admin API routes.
 *
 * Mounts:
 *   GET /_admin/meta         — All model metadata
 *   GET /_admin/meta/:model  — Single model metadata
 *   GET /_admin/health       — Admin health check
 */
export function createAdminRoutes(): Router {
  const router = Router();

  // ─── GET /_admin/meta — All models ──────────────────────────────────────

  router.get('/meta', (_req: Request, res: Response) => {
    const models = getAllModels();
    const meta: AdminModelMeta[] = [];

    for (const [name, modelClass] of models) {
      meta.push(serializeModelMeta(name, modelClass));
    }

    res.json({
      models: meta,
      count: meta.length,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── GET /_admin/meta/:model — Single model ─────────────────────────────

  router.get('/meta/:model', (req: Request, res: Response) => {
    const models = getAllModels();
    const modelName = String(req.params.model);

    const modelClass = models.get(modelName);
    if (!modelClass) {
      res.status(404).json({ error: `Model '${modelName}' not found.` });
      return;
    }

    res.json(serializeModelMeta(modelName, modelClass));
  });

  // ─── GET /_admin/health ─────────────────────────────────────────────────

  router.get('/health', (_req: Request, res: Response) => {
    const models = getAllModels();
    res.json({
      status: 'ok',
      models: Array.from(models.keys()),
      modelCount: models.size,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

// ─── Admin UI HTML ────────────────────────────────────────────────────────────

/**
 * Generate the admin UI HTML page.
 * This is a self-contained SPA that loads model metadata from the API
 * and renders the admin panel.
 */
export function generateAdminHtml(apiBasePath: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reacto Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .reacto-admin-layout { display: flex; min-height: 100vh; }
    .reacto-admin-sidebar { width: 240px; background: #1a1a2e; color: #eee; padding: 20px 0; flex-shrink: 0; }
    .reacto-admin-content { flex: 1; padding: 24px; overflow-x: auto; }
    .reacto-admin-title { font-size: 20px; font-weight: 700; padding: 0 20px 20px; border-bottom: 1px solid #2a2a4a; margin-bottom: 16px; color: #a78bfa; }
    .reacto-model-list { list-style: none; }
    .reacto-model-item button { width: 100%; text-align: left; padding: 10px 20px; background: none; border: none; color: #ccc; cursor: pointer; font-size: 14px; transition: all 0.15s; }
    .reacto-model-item button:hover { background: #2a2a4a; color: #fff; }
    .reacto-model-item.active button { background: #a78bfa; color: #fff; font-weight: 600; }
    .reacto-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .reacto-list-header h2 { font-size: 24px; }
    .reacto-list-header button, .reacto-form-actions button, .reacto-detail-actions button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
    .reacto-list-header button { background: #a78bfa; color: #fff; }
    .reacto-list-header button:hover { background: #8b5cf6; }
    .reacto-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .reacto-table th { background: #f8f9fa; padding: 12px 16px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e9ecef; }
    .reacto-table td { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
    .reacto-table tr:hover { background: #f8f9ff; }
    .reacto-clickable { cursor: pointer; }
    .reacto-empty { text-align: center; color: #999; padding: 40px !important; }
    .reacto-pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; }
    .reacto-pagination button { background: #e9ecef; color: #333; }
    .reacto-pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
    .reacto-pagination button:not(:disabled):hover { background: #dee2e6; }
    .reacto-form-field { margin-bottom: 16px; }
    .reacto-form-field label { display: block; margin-bottom: 4px; font-weight: 500; font-size: 14px; }
    .reacto-required { color: #e74c3c; margin-left: 2px; }
    .reacto-form-field input { width: 100%; max-width: 400px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .reacto-form-field input:focus { outline: none; border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167,139,250,0.2); }
    .reacto-field-error { border-color: #e74c3c !important; }
    .reacto-field-error-msg { color: #e74c3c; font-size: 12px; margin-top: 4px; display: block; }
    .reacto-form-actions { display: flex; gap: 12px; margin-top: 24px; }
    .reacto-form-actions button:first-child { background: #a78bfa; color: #fff; }
    .reacto-form-actions button:first-child:hover { background: #8b5cf6; }
    .reacto-form-actions button:first-child:disabled { opacity: 0.6; }
    .reacto-form-actions button:last-child { background: #e9ecef; color: #333; }
    .reacto-detail-table { width: 100%; max-width: 600px; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .reacto-detail-table th { background: #f8f9fa; padding: 12px 16px; text-align: left; font-weight: 600; width: 200px; border-bottom: 1px solid #e9ecef; }
    .reacto-detail-table td { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
    .reacto-detail-actions { display: flex; gap: 12px; margin-top: 20px; }
    .reacto-detail-actions button:nth-child(1) { background: #e9ecef; color: #333; }
    .reacto-detail-actions button:nth-child(2) { background: #a78bfa; color: #fff; }
    .reacto-detail-actions button:nth-child(3) { background: #e74c3c; color: #fff; }
    .reacto-detail-actions button:nth-child(3):hover { background: #c0392b; }
    .reacto-loading { text-align: center; padding: 40px; color: #666; }
    .reacto-error { background: #fff5f5; border: 1px solid #fed7d7; color: #c53030; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
    .reacto-not-found { text-align: center; padding: 40px; color: #999; }
    .reacto-crud-form { background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 600px; }
    .reacto-crud-form h2 { margin-bottom: 20px; }
  </style>
</head>
<body>
  <div id="reacto-admin-root"></div>
  <script>
    // ─── Mini React-like renderer (no build step needed) ───────────────────
    // This is a lightweight admin UI that works without a bundler.
    // It fetches model metadata from the API and renders CRUD views.

    const API_BASE = '${apiBasePath}';
    const ADMIN_API = API_BASE + '/_admin';

    let state = {
      models: [],
      currentModel: null,
      currentView: 'list',  // list | create | edit | detail
      records: [],
      currentRecord: null,
      page: 1,
      pageSize: 20,
      pagination: null,
      loading: false,
      error: null,
      formData: {},
    };

    function setState(patch) {
      Object.assign(state, patch);
      render();
    }

    async function fetchJSON(url, options) {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + res.statusText);
      return res.json();
    }

    async function loadModels() {
      try {
        const data = await fetchJSON(ADMIN_API + '/meta');
        setState({ models: data.models, currentModel: data.models[0] || null });
        if (data.models.length > 0) loadRecords();
      } catch (err) {
        setState({ error: err.message });
      }
    }

    async function loadRecords() {
      if (!state.currentModel) return;
      setState({ loading: true, error: null });
      try {
        const params = new URLSearchParams({ page: state.page, pageSize: state.pageSize });
        const data = await fetchJSON(API_BASE + '/' + state.currentModel.tableName + '?' + params);
        setState({ records: data.data, pagination: data.pagination, loading: false });
      } catch (err) {
        setState({ error: err.message, loading: false });
      }
    }

    async function loadRecord(id) {
      if (!state.currentModel) return;
      setState({ loading: true, error: null });
      try {
        const data = await fetchJSON(API_BASE + '/' + state.currentModel.tableName + '/' + id);
        setState({ currentRecord: data.data, loading: false, currentView: 'detail' });
      } catch (err) {
        setState({ error: err.message, loading: false });
      }
    }

    async function createRecord(formData) {
      setState({ loading: true, error: null });
      try {
        await fetchJSON(API_BASE + '/' + state.currentModel.tableName, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        setState({ loading: false, currentView: 'list', page: 1 });
        loadRecords();
      } catch (err) {
        setState({ error: err.message, loading: false });
      }
    }

    async function updateRecord(id, formData) {
      setState({ loading: true, error: null });
      try {
        await fetchJSON(API_BASE + '/' + state.currentModel.tableName + '/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        setState({ loading: false, currentView: 'list' });
        loadRecords();
      } catch (err) {
        setState({ error: err.message, loading: false });
      }
    }

    async function deleteRecord(id) {
      if (!confirm('Delete this record?')) return;
      setState({ loading: true, error: null });
      try {
        await fetchJSON(API_BASE + '/' + state.currentModel.tableName + '/' + id, { method: 'DELETE' });
        setState({ loading: false, currentView: 'list' });
        loadRecords();
      } catch (err) {
        setState({ error: err.message, loading: false });
      }
    }

    function switchModel(name) {
      const model = state.models.find(m => m.name === name);
      setState({ currentModel: model, currentView: 'list', page: 1, currentRecord: null });
      loadRecords();
    }

    // ─── Render ─────────────────────────────────────────────────────────

    function escapeHtml(str) {
      if (str === null || str === undefined) return '—';
      const s = String(str);
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function formatVal(v) {
      if (v === null || v === undefined) return '—';
      if (typeof v === 'object') return JSON.stringify(v);
      return escapeHtml(v);
    }

    function getInputType(type) {
      switch(type) {
        case 'integer': case 'bigInteger': case 'float': case 'decimal': return 'number';
        case 'boolean': return 'checkbox';
        case 'date': case 'datetime': return 'date';
        case 'email': return 'email';
        case 'url': return 'url';
        default: return 'text';
      }
    }

    function render() {
      const root = document.getElementById('reacto-admin-root');
      const model = state.currentModel;
      const fields = model ? model.fields : [];

      // Sidebar
      let sidebarHtml = '<h1 class="reacto-admin-title">Reacto Admin</h1><nav><ul class="reacto-model-list">';
      for (const m of state.models) {
        const active = model && m.name === model.name ? 'active' : '';
        sidebarHtml += '<li class="reacto-model-item ' + active + '"><button onclick="switchModel(\\'' + m.name + '\\')">' + escapeHtml(m.name) + '</button></li>';
      }
      sidebarHtml += '</ul></nav>';

      // Content
      let contentHtml = '';
      if (state.error) {
        contentHtml += '<div class="reacto-error"><p>' + escapeHtml(state.error) + '</p></div>';
      }

      if (!model) {
        contentHtml += '<div class="reacto-loading">No models registered.</div>';
      } else if (state.currentView === 'list') {
        contentHtml += '<div class="reacto-list-header"><h2>' + escapeHtml(model.name) + '</h2>';
        contentHtml += '<button onclick="setState({currentView:\\'create\\',formData:{}})">+ Create ' + escapeHtml(model.name) + '</button></div>';

        if (state.loading) {
          contentHtml += '<div class="reacto-loading">Loading...</div>';
        } else {
          contentHtml += '<table class="reacto-table"><thead><tr>';
          for (const f of fields) contentHtml += '<th>' + escapeHtml(f.name) + '</th>';
          contentHtml += '</tr></thead><tbody>';
          if (state.records.length === 0) {
            contentHtml += '<tr><td colspan="' + fields.length + '" class="reacto-empty">No records found.</td></tr>';
          } else {
            for (const rec of state.records) {
              contentHtml += '<tr class="reacto-clickable" onclick="loadRecord(' + rec.id + ')">';
              for (const f of fields) contentHtml += '<td>' + formatVal(rec[f.name]) + '</td>';
              contentHtml += '</tr>';
            }
          }
          contentHtml += '</tbody></table>';

          if (state.pagination && state.pagination.totalPages > 1) {
            contentHtml += '<div class="reacto-pagination">';
            contentHtml += '<button ' + (state.page <= 1 ? 'disabled' : '') + ' onclick="setState({page:' + (state.page-1) + '});loadRecords()">Previous</button>';
            contentHtml += '<span>Page ' + state.pagination.page + ' of ' + state.pagination.totalPages + ' (' + state.pagination.total + ' total)</span>';
            contentHtml += '<button ' + (state.page >= state.pagination.totalPages ? 'disabled' : '') + ' onclick="setState({page:' + (state.page+1) + '});loadRecords()">Next</button>';
            contentHtml += '</div>';
          }
        }
      } else if (state.currentView === 'create' || state.currentView === 'edit') {
        const isEdit = state.currentView === 'edit';
        contentHtml += '<div class="reacto-crud-form"><h2>' + (isEdit ? 'Edit' : 'Create') + ' ' + escapeHtml(model.name) + '</h2>';
        contentHtml += '<form onsubmit="handleFormSubmit(event)">';
        for (const f of fields) {
          if (f.primaryKey && f.autoIncrement) continue;
          const val = state.formData[f.name] || '';
          contentHtml += '<div class="reacto-form-field">';
          contentHtml += '<label for="f-' + f.name + '">' + escapeHtml(f.name) + (f.nullable ? '' : ' <span class="reacto-required">*</span>') + '</label>';
          contentHtml += '<input id="f-' + f.name + '" type="' + getInputType(f.type) + '" value="' + escapeHtml(val) + '" data-field="' + f.name + '" ' + (!f.nullable && !f.default ? 'required' : '') + '>';
          contentHtml += '</div>';
        }
        contentHtml += '<div class="reacto-form-actions">';
        contentHtml += '<button type="submit">' + (isEdit ? 'Update' : 'Create') + '</button>';
        contentHtml += '<button type="button" onclick="setState({currentView:\\'list\\'})">Cancel</button>';
        contentHtml += '</div></form></div>';
      } else if (state.currentView === 'detail' && state.currentRecord) {
        contentHtml += '<h2>' + escapeHtml(model.name) + ' #' + state.currentRecord.id + '</h2>';
        contentHtml += '<table class="reacto-detail-table"><tbody>';
        for (const f of fields) {
          contentHtml += '<tr><th>' + escapeHtml(f.name) + '</th><td>' + formatVal(state.currentRecord[f.name]) + '</td></tr>';
        }
        contentHtml += '</tbody></table>';
        contentHtml += '<div class="reacto-detail-actions">';
        contentHtml += '<button onclick="setState({currentView:\\'list\\'})">Back</button>';
        contentHtml += '<button onclick="editRecord()">Edit</button>';
        contentHtml += '<button onclick="deleteRecord(' + state.currentRecord.id + ')">Delete</button>';
        contentHtml += '</div>';
      }

      root.innerHTML = '<div class="reacto-admin-layout"><aside class="reacto-admin-sidebar">' + sidebarHtml + '</aside><main class="reacto-admin-content">' + contentHtml + '</main></div>';
    }

    // ─── Event Handlers ─────────────────────────────────────────────────

    window.switchModel = switchModel;
    window.loadRecord = loadRecord;
    window.deleteRecord = deleteRecord;

    window.editRecord = function() {
      const rec = state.currentRecord;
      if (!rec) return;
      const formData = {};
      for (const f of state.currentModel.fields) {
        formData[f.name] = rec[f.name] || '';
      }
      setState({ currentView: 'edit', formData });
    };

    window.handleFormSubmit = function(e) {
      e.preventDefault();
      const model = state.currentModel;
      const formData = {};
      for (const f of model.fields) {
        if (f.primaryKey && f.autoIncrement) continue;
        const input = document.getElementById('f-' + f.name);
        if (input) {
          let val = input.value;
          if (input.type === 'number' && val !== '') val = Number(val);
          if (input.type === 'checkbox') val = input.checked;
          if (val === '' && f.nullable) val = null;
          formData[f.name] = val;
        }
      }
      if (state.currentView === 'edit' && state.currentRecord) {
        updateRecord(state.currentRecord.id, formData);
      } else {
        createRecord(formData);
      }
    };

    // ─── Init ──────────────────────────────────────────────────────────

    loadModels();
  </script>
</body>
</html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeModelMeta(name: string, modelClass: ModelClass): AdminModelMeta {
  const fields: AdminFieldMeta[] = [];
  for (const [key, fieldDef] of modelClass.fields) {
    fields.push({
      name: key,
      type: fieldDef.type,
      primaryKey: fieldDef.primaryKey,
      autoIncrement: fieldDef.autoIncrement,
      unique: fieldDef.unique,
      nullable: fieldDef.nullable,
      default: fieldDef.default,
      maxLength: fieldDef.maxLength,
      choices: fieldDef.choices,
      verboseName: fieldDef.verboseName,
      helpText: fieldDef.helpText,
    });
  }

  const relations: AdminRelationMeta[] = [];
  for (const [key, relDef] of modelClass.relations) {
    relations.push({
      name: key,
      type: relDef.type,
      target: relDef.target()._modelName,
      foreignKey: relDef.foreignKey,
      inverseSide: relDef.inverseSide,
      onDelete: relDef.onDelete,
      nullable: relDef.nullable,
    });
  }

  return {
    name,
    tableName: modelClass.tableName,
    verboseName: modelClass.meta.verboseName,
    verboseNamePlural: modelClass.meta.verboseNamePlural,
    fields,
    relations,
    fieldCount: fields.length,
    ordering: modelClass.meta.ordering,
  };
}
