import React from 'react';
import { ShoppingBag, Plus, LogOut, User, Server, Shield } from 'lucide-react';

export default function Navbar({ user, clusterStatus, onOpenCreate, onOpenAuth, onLogout }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">WooForge</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                K8s Multi-Tenant
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Automated WooCommerce Provisioner</p>
          </div>
        </div>

        {/* Center: Cluster Status */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Cluster:</span>
          {clusterStatus?.connected ? (
            <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online ({clusterStatus.nodes} Nodes / {clusterStatus.k8s_version || 'Ready'})</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Standalone / Ready</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              <button
                onClick={onOpenCreate}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>New Store</span>
              </button>

              <div className="flex items-center pl-3 border-l border-slate-800 space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200">{user.username}</span>
                  <span className="text-[10px] text-slate-400 capitalize flex items-center justify-end space-x-1">
                    {user.role === 'admin' && <Shield className="w-2.5 h-2.5 text-purple-400" />}
                    <span>{user.role}</span>
                  </span>
                </div>
                
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
