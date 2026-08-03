/**
 * Login Page
 */
import React from 'react';
import { serverComponent } from '@reacto-org/ssr';
import { Layout } from '../templates/Layout.js';

export const LoginPage = serverComponent(async (ctx) => {
  const error = ctx.query.error;

  return (
    <Layout title="Login — CineLog" user={ctx.user}>
      <div style={{ maxWidth: 400, margin: '60px auto', padding: 24 }}>
        <div style={{ background: '#1a1a2e', borderRadius: 12, border: '1px solid #2a2a4a' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a4a' }}>
            <h2 style={{ fontSize: 16, color: '#fff', margin: 0 }}>Welcome Back</h2>
          </div>
          <div style={{ padding: 20 }}>
            {error && (
              <div style={{
                background: 'rgba(231,76,60,0.1)',
                border: '1px solid #e74c3c',
                color: '#e74c3c',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}>
                {decodeURIComponent(error)}
              </div>
            )}
            <form method="POST" action="/auth/login">
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>Email</label>
                <input type="email" name="email" required placeholder="you@example.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>Password</label>
                <input type="password" name="password" required placeholder="••••••••" style={inputStyle} />
              </div>
              <button type="submit" style={{
                width: '100%',
                background: '#6c5ce7',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: 500,
              }}>
                🔑 Login
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
              Don't have an account? <a href="/register" style={{ color: '#6c5ce7' }}>Register</a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}, 'LoginPage');

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#16213e',
  border: '1px solid #2a2a4a',
  color: '#e0e0e0',
  padding: '10px 14px',
  borderRadius: 8,
  fontSize: 14,
};
