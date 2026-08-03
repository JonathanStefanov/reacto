/**
 * Login Page
 */
import { serverComponent } from '@reacto-org/ssr';
import React from 'react';
import { Layout } from '../templates/Layout.js';

export const LoginPage = serverComponent(async (ctx) => {
  const error = ctx.query.error;

  return (
    <Layout title="Login — CineLog">
      <div className="container">
        <div className="auth-container">
          <div className="card">
            <div className="card-header"><h2>Welcome Back</h2></div>
            <div className="card-body">
              {error && <div className="error-msg">{decodeURIComponent(error)}</div>}
              <form method="POST" action="/auth/login">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" required placeholder="you@example.com" />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input type="password" id="password" name="password" required placeholder="••••••••" />
                </div>
                <button type="submit" className="btn btn-primary btn-block">🔑 Login</button>
              </form>
              <div className="switch-auth">
                Don't have an account? <a href="/register">Register</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}, 'LoginPage');
