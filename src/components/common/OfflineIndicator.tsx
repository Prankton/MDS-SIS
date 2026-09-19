import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useAuth();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500/10 border-y border-amber-500/30 px-4 py-2 text-amber-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></div>
          <span className="font-mono font-bold uppercase tracking-wider text-amber-300">
            [MODE OFFLINE AKTIF]
          </span>
          <span className="text-amber-100">
            Koneksi internet terputus. Seluruh pencatatan stok &amp; sell-out tersimpan aman di IndexedDB lokal dan disinkronkan otomatis saat kembali online.
          </span>
        </div>
      </div>
    </div>
  );
};
