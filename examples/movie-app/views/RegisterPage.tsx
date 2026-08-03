/**
 * Register Page
 */
import { serverComponent } from '@reacto-org/ssr';
import React from 'react';
import { Layout } from '../templates/Layout.js';

export const RegisterPage = serverComponent(async (ctx) => {
  const error = ctx.query.error;

  return (
    <Layout title="Register — CineLog">
      <div className="container">
        <div className="auth-container">
          <div className="card">
            <div className="card-header"><h2>Create Account</h2></div>
            <div className="card-body">
              {error && <div className="error-msg">{decodeURIComponent(error)}</div>}
              <form method="POST" action="/auth/register">
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input type="text" id="username" name="username" required placeholder="moviefan42" />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" required placeholder="you@example.com" />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input type="password" id="password" name="password" required placeholder="••••••••" />
                </div>
                <button type="submit" className="btn btn-primary btn-block">🚀 Register</button>
              </form>
              <div className="switch-auth">
                Already have an account? <a href="/login">Login</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}, 'RegisterPage');
