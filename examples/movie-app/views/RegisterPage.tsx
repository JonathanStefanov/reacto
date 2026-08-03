import React from 'react';
import { serverComponent } from '@reacto-org/ssr';

export default serverComponent(async (ctx) => {
  const error = ctx.query.error;

  return (
    <div>
      <nav style={nav}><h1 style={{ fontSize: 20, color: '#fff', margin: 0 }}>🎬 <span style={{ color: '#6c5ce7' }}>Cine</span>Log</h1></nav>
      <div style={{ maxWidth: 400, margin: '60px auto', padding: 24 }}>
        <div style={{ background: '#1a1a2e', borderRadius: 12, border: '1px solid #2a2a4a' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a4a' }}>
            <h2 style={{ fontSize: 16, color: '#fff', margin: 0 }}>Create Account</h2>
          </div>
          <div style={{ padding: 20 }}>
            {error && <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{decodeURIComponent(error)}</div>}
            <form method="POST" action="/auth/register">
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>Username</label>
                <input type="text" name="username" required placeholder="moviefan42" style={input} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>Email</label>
                <input type="email" name="email" required placeholder="you@example.com" style={input} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>Password</label>
                <input type="password" name="password" required placeholder="••••••••" style={input} />
              </div>
              <button type="submit" style={btn}>🚀 Register</button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
              Already have an account? <a href="/loginpage" style={{ color: '#6c5ce7' }}>Login</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, 'RegisterPage');

const nav: React.CSSProperties = { background: '#1a1a2e', borderBottom: '1px solid #2a2a4a', padding: '16px 24px' };
const input: React.CSSProperties = { width: '100%', background: '#16213e', border: '1px solid #2a2a4a', color: '#e0e0e0', padding: '10px 14px', borderRadius: 8, fontSize: 14 };
const btn: React.CSSProperties = { width: '100%', background: '#6c5ce7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 500 };
