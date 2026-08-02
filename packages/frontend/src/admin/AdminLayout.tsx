/**
 * @reacto/frontend — Admin layout wrapper
 *
 * Provides a sidebar + content area layout for the admin panel.
 */
import React from 'react';

interface AdminLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Layout wrapper with sidebar and content area.
 */
export function AdminLayout({ sidebar, children }: AdminLayoutProps): React.ReactElement {
  return (
    <div className="reacto-admin-layout">
      <aside className="reacto-admin-sidebar">
        {sidebar}
      </aside>
      <main className="reacto-admin-content">
        {children}
      </main>
    </div>
  );
}
