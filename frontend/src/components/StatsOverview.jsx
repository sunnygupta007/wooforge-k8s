import React from 'react';
import { Store, HardDrive, Cpu, Activity } from 'lucide-react';

export default function StatsOverview({ limitsData, stores }) {
  const activeStores = stores.length;
  const maxStores = limitsData?.limits?.max_stores || 5;
  const storePercent = Math.min(100, Math.round((activeStores / maxStores) * 100));

  const totalStorage = limitsData?.usage?.total_storage_gb || stores.reduce((acc, s) => acc + (s.storage_gb || 2), 0);
  const maxStorage = (limitsData?.limits?.max_storage_per_store_gb || 5) * maxStores;
  const storagePercent = Math.min(100, Math.round((totalStorage / maxStorage) * 100));

  const runningCount = stores.filter(s => s.status === 'RUNNING').length;
  const provisioningCount = stores.filter(s => s.status === 'PROVISIONING').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      
      {/* Store Quota Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Stores</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Store className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">{activeStores}</span>
          <span className="text-sm font-medium text-slate-500">/ {maxStores} allowed</span>
        </div>
        <div className="mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${storePercent}%` }}
          ></div>
        </div>
      </div>

      {/* Storage Allocation Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Allocated Storage</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">{totalStorage} GiB</span>
          <span className="text-sm font-medium text-slate-500">/ {maxStorage} GiB</span>
        </div>
        <div className="mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${storagePercent}%` }}
          ></div>
        </div>
      </div>

      {/* Memory Allocation Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Memory Allocation</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {(stores.reduce((acc, s) => acc + (s.memory_mb || 1024), 0) / 1024).toFixed(1)} GiB
          </span>
          <span className="text-sm font-medium text-slate-500">Reserved RAM</span>
        </div>
        <p className="mt-4 text-xs text-slate-400">Guaranteed by K8s ResourceQuotas</p>
      </div>

      {/* Health Status Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Store Health</span>
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div>
            <div className="text-lg font-bold text-emerald-400">{runningCount}</div>
            <div className="text-[11px] text-slate-500 uppercase">Running</div>
          </div>
          <div className="h-7 w-[1px] bg-slate-800"></div>
          <div>
            <div className="text-lg font-bold text-amber-400">{provisioningCount}</div>
            <div className="text-[11px] text-slate-500 uppercase">Building</div>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">Continuous health polling enabled</p>
      </div>

    </div>
  );
}
