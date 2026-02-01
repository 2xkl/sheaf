import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeSwitcher from '../components/ThemeSwitcher';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--color-bg) flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-(--color-primary)">sheaf</span>
          </h1>
          <p className="text-(--color-text-muted) mt-2 text-sm">
            PDF hosting platform
          </p>
        </div>

        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Sign in</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-(--color-danger)/10 text-(--color-danger) text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-(--color-text-muted)">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-bg-input) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/40 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-(--color-text-muted)">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-bg-input) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/40 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-(--color-primary) text-white font-medium hover:bg-(--color-primary-hover) transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-(--color-text-muted) text-center mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-(--color-primary) hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
