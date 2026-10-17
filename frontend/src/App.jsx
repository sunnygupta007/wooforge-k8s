import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import StoreCard from './components/StoreCard';
import CreateStoreModal from './components/CreateStoreModal';
import StoreDetailsModal from './components/StoreDetailsModal';
import AuthModal from './components/AuthModal';
import { storeService, authService } from './services/api';
import { ShoppingBag, Plus, RefreshCw, Layers } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [stores, setStores] = useState([]);
  const [limitsData, setLimitsData] = useState(null);
  const [clusterStatus, setClusterStatus] = useState(null);
  const [presets, setPresets] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // References for polling
  const pollingRef = useRef(null);

  // Load cluster stats & presets
  useEffect(() => {
    storeService.getClusterStatus().then(setClusterStatus).catch(() => {});
    storeService.listPresets().then(setPresets).catch(() => {});

    const handleAuthEvent = () => {
      setUser(authService.getCurrentUser());
    };
    window.addEventListener('auth_change', handleAuthEvent);
    return () => window.removeEventListener('auth_change', handleAuthEvent);
  }, []);

  // Fetch stores and quotas
  const fetchData = useCallback(async (isSilent = false) => {
    if (!user) {
      setStores([]);
      setLimitsData(null);
      setLoading(false);
      return;
    }
    if (!isSilent) setRefreshing(true);
    try {
      const [storesRes, limitsRes] = await Promise.all([
        storeService.listStores(),
        storeService.getLimits(),
      ]);
      setStores(storesRes);
      setLimitsData(limitsRes);
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
      if (!isSilent) setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live periodic polling for provisioning and running stores
  useEffect(() => {
    if (!user) return;

    // Check if any store is still provisioning or deleting
    const hasPendingStores = stores.some((s) =>
      ['PROVISIONING', 'DELETING'].includes(s.status)
    );

    const intervalTime = hasPendingStores ? 3500 : 8000;

    pollingRef.current = setInterval(() => {
      fetchData(true);
    }, intervalTime);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [user, stores, fetchData]);

  // Store creation handler
  const handleCreateStore = async (payload) => {
    const res = await storeService.createStore(payload);
    await fetchData();
    return res;
  };

  // Store deletion handler
  const handleDeleteStore = async (store) => {
    const confirm = window.confirm(
      `Are you sure you want to delete "${store.name}"?\nThis will permanently delete the namespace "${store.namespace}" and its persistent volumes.`
    );
    if (!confirm) return;

    try {
      await storeService.deleteStore(store.id);
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, status: 'DELETING', status_message: 'Terminating...' } : s))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete store');
    }
  };

  // Inspect store handler
  const handleSelectStore = async (store) => {
    try {
      const fullStore = await storeService.getStore(store.id);
      setSelectedStore(fullStore);
      setIsDetailsOpen(true);
    } catch (err) {
      setSelectedStore(store);
      setIsDetailsOpen(true);
    }
  };

  const handleRefreshStore = async (storeId) => {
    try {
      const fullStore = await storeService.getStore(storeId);
      setSelectedStore(fullStore);
      setStores((prev) => prev.map((s) => (s.id === storeId ? fullStore : s)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Navigation */}
      <Navbar
        user={user}
        clusterStatus={clusterStatus}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {!user ? (
          /* Unauthenticated Landing State */
          <div className="my-16 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-6">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              On-Demand Multi-Tenant WooCommerce on Kubernetes
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
              Provision isolated WooCommerce store namespaces in seconds. Includes automated MySQL stacks,
              WP-CLI catalog seeding, persistent volume management, and live container health monitoring.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-xl shadow-emerald-600/25 transition-all hover:scale-105"
            >
              Get Started / Sign In
            </button>
          </div>
        ) : (
          /* Authenticated Dashboard View */
          <div>
            
            {/* Stats Metrics Header */}
            <StatsOverview limitsData={limitsData} stores={stores} />

            {/* Section Bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                  <span>Provisioned Stores</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {stores.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time status synced with Kubernetes cluster
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchData()}
                  disabled={refreshing}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Manual refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Store</span>
                </button>
              </div>
            </div>

            {/* Store Grid or Empty State */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse"></div>
                ))}
              </div>
            ) : stores.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    onSelect={handleSelectStore}
                    onDelete={handleDeleteStore}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 border-dashed">
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400 mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">No stores provisioned yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                  Click below to deploy your first on-demand isolated WooCommerce store onto the Kubernetes cluster.
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Provision First Store</span>
                </button>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Modals */}
      <CreateStoreModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateStore}
        presets={presets}
        userLimits={limitsData?.limits}
      />

      <StoreDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        store={selectedStore}
        onRefresh={handleRefreshStore}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          fetchData();
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400">
        <p>WooForge Kubernetes Engine • Automated Multi-Tenant WooCommerce Platform</p>
      </footer>

    </div>
  );
}
