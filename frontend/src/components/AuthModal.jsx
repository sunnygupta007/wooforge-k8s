import React, { useState } from 'react';
import { X, Lock, User, Mail, Loader2, Sparkles } from 'lucide-react';
import { authService } from '../services/api';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let res;
      if (isRegister) {
        res = await authService.register(username, email, password);
      } else {
        res = await authService.login(username, password);
      }
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.login('admin', 'admin123');
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError('Could not connect with demo admin credentials. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isRegister ? 'Create WooForge Account' : 'Sign In to WooForge'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              {isRegister ? 'Username' : 'Username or Email'}
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl px-3 py-2.5 text-sm">
              <User className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-transparent text-white outline-none placeholder-slate-500 text-sm"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Email Address
              </label>
              <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl px-3 py-2.5 text-sm">
                <Mail className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-transparent text-white outline-none placeholder-slate-500 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Password
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl px-3 py-2.5 text-sm">
              <Lock className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-white outline-none placeholder-slate-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isRegister ? 'Register & Continue' : 'Sign In'}</span>
          </button>

          {/* Quick Demo Login Shortcut */}
          {!isRegister && (
            <button
              type="button"
              onClick={handleDemoAdmin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium text-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>One-Click Login as Demo Admin (admin / admin123)</span>
            </button>
          )}

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
