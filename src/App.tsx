/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { MerchandiserView } from './components/md/MerchandiserView';
import { StoreManagement } from './components/admin/StoreManagement';
import { ItemManagement } from './components/admin/ItemManagement';
import { VisitLogsView } from './components/admin/VisitLogsView';
import { Store, Item, VisitLog } from './types';
import { storeService } from './services/storeService';
import { itemService } from './services/itemService';
import { visitService } from './services/visitService';

function MainLayout() {
  const { role } = useAuth();
  const [activeAdminTab, setActiveAdminTab] = useState<'stores' | 'items' | 'logs'>('stores');
  
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize data subscriptions and seed defaults if empty
  useEffect(() => {
    let unsubStores: (() => void) | undefined;
    let unsubItems: (() => void) | undefined;
    let unsubVisits: (() => void) | undefined;

    const init = async () => {
      // Seed stores and items if empty in Firestore
      await Promise.all([
        storeService.seedInitialStoresIfNeeded(),
        itemService.seedInitialItemsIfNeeded()
      ]);

      // Subscribe to real-time updates (works offline with persistentLocalCache)
      unsubStores = storeService.subscribeStores((fetchedStores) => {
        setStores(fetchedStores);
      });

      unsubItems = itemService.subscribeItems((fetchedItems) => {
        setItems(fetchedItems);
      });

      unsubVisits = visitService.subscribeVisits((fetchedVisits) => {
        setVisits(fetchedVisits);
        setIsLoading(false);
      });
    };

    init();

    return () => {
      if (unsubStores) unsubStores();
      if (unsubItems) unsubItems();
      if (unsubVisits) unsubVisits();
    };
  }, []);

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#07080a] text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Header Navigation */}
      <Header
        activeAdminTab={activeAdminTab}
        setActiveAdminTab={setActiveAdminTab}
      />

      {/* Offline Status / Cache Alert Bar */}
      <OfflineIndicator />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 overflow-x-hidden">
        {isLoading && stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 font-mono text-xs space-y-2">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <span>MEMUAT DATA SISTEM MD.SYS...</span>
          </div>
        ) : (
          <>
            {role === 'merchandiser' ? (
              <MerchandiserView
                stores={stores}
                items={items}
                visits={visits}
                onRefresh={() => {}}
              />
            ) : (
              <div>
                {activeAdminTab === 'stores' && (
                  <StoreManagement
                    stores={stores}
                    onStoresChanged={() => {}}
                  />
                )}
                {activeAdminTab === 'items' && (
                  <ItemManagement
                    items={items}
                    onItemsChanged={() => {}}
                  />
                )}
                {activeAdminTab === 'logs' && (
                  <VisitLogsView
                    visits={visits}
                    stores={stores}
                    items={items}
                    onVisitsChanged={() => {}}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Technical Dark Swiss Footer */}
      <footer className="border-t border-[#1a1c22] bg-[#0a0b0d] py-3 text-[10px] font-mono text-neutral-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>MD.SYS OFFLINE-FIRST ARCHITECTURE (INDEXEDDB PERSISTENCE)</span>
          </div>
          <div className="text-neutral-600">
            SWISS MODERNIST DESIGN • 3-TIER UNIT CONVERSION (DUS - BOX - PCS) • STRICT PRIORITY ROUTING
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
