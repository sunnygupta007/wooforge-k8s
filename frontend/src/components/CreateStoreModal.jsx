import React, { useState } from 'react';
import { X, Sparkles, HardDrive, ShoppingCart, Lock, Mail, Globe, Loader2 } from 'lucide-react';

export default function CreateStoreModal({ isOpen, onClose, onSubmit, presets, userLimits }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [storageGb, setStorageGb] = useState(2);
  const [catalogPreset, setCatalogPreset] = useState('electronics');
  const [customPassword, setCustomPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    // Auto slugify
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[-\s]+/g, '-')
      .slice(0, 30);
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a store name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim(),
        storage_gb: Number(storageGb),
        catalog_preset: catalogPreset,
        admin_email: adminEmail.trim() || undefined,
        admin_password: customPassword.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initiate store provisioning');
    } finally {
      setLoading(false);
    }
  };

  const maxAllowedStorage = userLimits?.max_storage_per_store_gb || 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Provision New WooCommerce Store</h2>
              <p className="text-xs text-slate-400">Allocates dedicated Kubernetes Namespace & isolated MySQL stack</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Store Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Urban Threads"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Subdomain / Slug
              </label>
              <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl px-3 py-2.5 text-sm">
                <Globe className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="urban-threads"
                  className="w-full bg-transparent text-white outline-none placeholder-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Catalog Preset Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5 flex items-center justify-between">
              <span>Catalog Preset</span>
              <span className="text-[11px] text-emerald-400 font-normal">Auto-populated via WP-CLI</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets && Object.entries(presets).map(([key, item]) => (
                <div
                  key={key}
                  onClick={() => setCatalogPreset(key)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    catalogPreset === key
                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-semibold text-xs mb-1">
                    <ShoppingCart className={`w-3.5 h-3.5 ${catalogPreset === key ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Storage & Admin Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1 flex items-center justify-between">
                <span>Storage Quota</span>
                <span className="text-slate-400 font-normal">{storageGb} GiB</span>
              </label>
              <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
                <HardDrive className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <input
                  type="range"
                  min="1"
                  max={maxAllowedStorage}
                  value={storageGb}
                  onChange={(e) => setStorageGb(e.target.value)}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Admin Email
              </label>
              <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl px-3 py-2.5 text-sm">
                <Mail className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-transparent text-white outline-none placeholder-slate-500 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Custom Admin Password <span className="text-slate-500 font-normal lowercase">(optional - autogenerated if blank)</span>
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl px-3 py-2.5 text-sm">
              <Lock className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
              <input
                type="password"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Leave blank for secure generated password"
                className="w-full bg-transparent text-white outline-none placeholder-slate-500 text-sm"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Launching Kubernetes Stack...' : 'Deploy Store'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
