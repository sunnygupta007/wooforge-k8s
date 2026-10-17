import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck, Box, RefreshCw } from 'lucide-react';

export default function StoreDetailsModal({ store, isOpen, onClose, onRefresh }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  if (!isOpen || !store) return null;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh(store.id);
    setRefreshing(false);
  };

  const pods = store.k8s_details?.pods || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{store.name}</h2>
              <p className="text-xs text-slate-400 font-mono">Namespace: {store.namespace}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              title="Refresh K8s status"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Quick Access URLs */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Endpoints
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={store.store_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 transition-colors group"
              >
                <div>
                  <span className="text-xs font-medium text-slate-400">Storefront URL</span>
                  <p className="text-sm font-semibold text-white truncate group-hover:text-emerald-400">{store.domain}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
              </a>

              <a
                href={store.admin_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 transition-colors group"
              >
                <div>
                  <span className="text-xs font-medium text-slate-400">WordPress Admin</span>
                  <p className="text-sm font-semibold text-white truncate group-hover:text-emerald-400">{store.domain}/wp-admin</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
              </a>
            </div>
          </div>

          {/* WordPress Administrator Credentials */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Store Credentials
            </h4>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Username:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-semibold">{store.admin_username || 'admin'}</span>
                  <button
                    onClick={() => copyToClipboard(store.admin_username || 'admin', 'username')}
                    className="p-1 hover:text-emerald-400 text-slate-400"
                  >
                    {copiedKey === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Password:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-semibold">{store.admin_password || '********'}</span>
                  {store.admin_password && (
                    <button
                      onClick={() => copyToClipboard(store.admin_password, 'password')}
                      className="p-1 hover:text-emerald-400 text-slate-400"
                    >
                      {copiedKey === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Admin Email:</span>
                <span className="text-slate-300">{store.admin_email}</span>
              </div>
            </div>
          </div>

          {/* Kubernetes Pod Health & Details */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Kubernetes Pod Status</span>
              <span className="text-[11px] font-normal text-slate-500">{pods.length} pods detected</span>
            </h4>

            {pods.length > 0 ? (
              <div className="space-y-2">
                {pods.map((pod, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Box className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="font-semibold text-white font-mono">{pod.name}</p>
                        <p className="text-[11px] text-slate-500">IP: {pod.ip || 'Pending'} • Restarts: {pod.restarts}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        pod.ready ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {pod.ready ? 'Ready' : pod.phase}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-center">
                {store.status === 'PROVISIONING' ? 'Pods are currently being scheduled by Kubernetes...' : 'No pod metrics available'}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
