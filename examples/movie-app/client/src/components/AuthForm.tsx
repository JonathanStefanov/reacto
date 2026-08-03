import { useState, type FormEvent } from 'react';

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (username: string, email: string, password: string) => Promise<void>;
  loading: boolean;
}

export function AuthForm({ onLogin, onRegister, loading }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);

    try {
      if (mode === 'login') {
        await onLogin(
          fd.get('email') as string,
          fd.get('password') as string
        );
      } else {
        await onRegister(
          fd.get('username') as string,
          fd.get('email') as string,
          fd.get('password') as string
        );
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="auth-container">
      <div className="card">
        <div className="card-header">
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        </div>
        <div className="card-body">
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="moviefan42"
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? '⏳ Loading...' : mode === 'login' ? '🔑 Login' : '🚀 Register'}
            </button>
          </form>
          <div className="switch-auth">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); setError(''); }}>
                  Register
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setError(''); }}>
                  Login
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
