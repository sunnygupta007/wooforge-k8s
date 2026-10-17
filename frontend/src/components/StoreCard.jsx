import React from 'react';
import { ExternalLink, Trash2, Key, HardDrive, Cpu, Layers, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function StoreCard({ store, onSelect, onDelete }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Running</span>
          </span>
        );
      case 'PROVISIONING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Provisioning</span>
          </span>
        );
      case 'DELETING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
            <span>Deleting</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  const formattedDate = store.created_at ? new Date(store.created_at).toLocaleDateString() : 'Just now';

  return (
    <div className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-lg hover:shadow-slate-950/50">
      
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
              {store.name}
            </h3>
            <a
              href={store.store_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center space-x-1 mt-0.5 truncate transition-colors"
            >
              <span className="truncate">{store.domain}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
          <div>{getStatusBadge(store.status)}</div>
        </div>

        {/* Status Message info */}
        {store.status_message && (
          <p className="text-xs text-slate-400 bg-slate-950/40 border border-slate-800/60 rounded-lg p-2.5 mb-4 line-clamp-2">
            {store.status_message}
          </p>
        )}

        {/* Spec Badges */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/60 text-xs mb-4">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <HardDrive className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span>{store.storage_gb} GiB</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span>{store.memory_mb} MiB</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate capitalize">{store.catalog_preset || 'Catalog'}</span>
          </div>
        </div>

        {/* Namespace & Date Meta */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-4">
          <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            ns: {store.namespace}
          </span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formattedDate}</span>
          </span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => onSelect(store)}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          <Key className="w-3.5 h-3.5 text-emerald-400" />
          <span>Access & K8s</span>
        </button>

        <div className="flex items-center space-x-2">
          {store.status === 'RUNNING' && (
            <a
              href={store.admin_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 transition-colors"
            >
              WP Admin
            </a>
          )}

          <button
            onClick={() => onDelete(store)}
            disabled={store.status === 'DELETING'}
            title="Delete store and namespace"
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
