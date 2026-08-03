/**
 * Templates — Reusable layout components
 */
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  user?: { id: number; username: string } | null;
}

export function Layout({ children, title, user }: LayoutProps) {
  return (
    <div>
      <header style={{
        background: '#1a1a2e',
        borderBottom: '1px solid #2a2a4a',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <h1 style={{ fontSize: 20, color: '#fff', margin: 0 }}>
          🎬 <span style={{ color: '#6c5ce7' }}>Cine</span>Log
        </h1>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/" style={navBtn}>🎬 Movies</a>
          {user ? (
            <>
              <a href="/profile" style={navBtn}>📋 My List</a>
              <span style={{ color: '#fff', fontSize: 14 }}>
                <span style={avatar}>{user.username[0].toUpperCase()}</span>
                {' '}{user.username}
              </span>
              <a href="/auth/logout" style={navBtn}>Logout</a>
            </>
          ) : (
            <>
              <a href="/login" style={navBtn}>🔑 Login</a>
              <a href="/register" style={navBtn}>🚀 Register</a>
            </>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2a2a4a',
  color: '#e0e0e0',
  padding: '8px 16px',
  borderRadius: 6,
  fontSize: 13,
  textDecoration: 'none',
  transition: 'all 0.15s',
};

const avatar: React.CSSProperties = {
  display: 'inline-flex',
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: '#6c5ce7',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  color: '#fff',
  fontWeight: 600,
  marginRight: 6,
};
