/**
 * @reacto-org/frontend — Auto-generated React hooks, CRUD pages, and admin panel
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type { ModelLike, FieldMeta } from './types.js';

// ─── Hooks ────────────────────────────────────────────────────────────────────

export { useList, useGet, useCreate, useUpdate, useDelete } from './hooks/useModel.js';
export { useSubscription, useMultiSubscription } from './hooks/useSubscription.js';
export type { SubscriptionOptions, SubscriptionResult } from './hooks/useSubscription.js';

// ─── Pages ────────────────────────────────────────────────────────────────────

export { CrudList } from './pages/CrudList.js';
export { CrudForm } from './pages/CrudForm.js';
export { CrudDetail } from './pages/CrudDetail.js';

// ─── Admin ────────────────────────────────────────────────────────────────────

export { AdminPanel } from './admin/AdminPanel.js';
export { AdminLayout } from './admin/AdminLayout.js';
