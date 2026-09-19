import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Shield, 
  Truck, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Calendar, 
  Package, 
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { Role } from '../../types';

interface HeaderProps {
  activeAdminTab: 'stores' | 'items' | 'logs';
  setActiveAdminTab: (tab: 'stores' | 'items' | 'logs') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeAdminTab,
  setActiveAdminTab
}) => {
  const { 
    userProfile, 
    role, 
    setRole, 
    setMdName,
    currentUser, 
    signInWithGoogle, 
    logout, 
    isOnline
  } = useAuth();

  const [isEditingMd, setIsEditingMd] = useState(false);
  const [tempMdName, setTempMdName] = useState(userProfile.displayName);

  const handleSaveMdName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempMdName.trim()) {
      setMdName(tempMdName.trim());
      setIsEditingMd(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0a0b0d] border-b border-[#1f2228] text-white">
      {/* Top System Bar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-3 w-full">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#14171c] border border-[#262930] px-2 py-1 rounded">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-xs"></div>
            <span className="font-mono text-xs font-black tracking-widest text-white">MD.SYS</span>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-bold tracking-wider text-neutral-200 uppercase">Field Operations & Sell-Out</span>
            <span className="text-[10px] font-mono text-neutral-500">OFFLINE-FIRST ARCHITECTURE</span>
          </div>
        </div>

        {/* Middle: Role Selector Switcher */}
        <div className="flex items-center bg-[#14171c] p-0.5 rounded border border-[#262930] shrink-0">
          <button
            id="role-btn-md"
            onClick={() => setRole('merchandiser')}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
              role === 'merchandiser'
                ? 'bg-neutral-100 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Merchandiser</span>
            <span className="sm:hidden">MD</span>
          </button>
          <button
            id="role-btn-admin"
            onClick={() => setRole('admin')}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
              role === 'admin'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Right Tools & Sync Status */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Offline/Online Live Indicator */}
          <div 
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono font-bold uppercase tracking-wider border shrink-0 ${
              isOnline 
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' 
                : 'bg-amber-950/60 text-amber-300 border-amber-600/80 animate-pulse'
            }`}
            title={isOnline ? 'Connected to live Firebase' : 'Using Local IndexedDB Persistence'}
          >
            {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
            <span className="hidden lg:inline">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* PWA Install */}
          <PWAInstallButton />

          {/* User Profile / MD Switch */}
          <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-[#1f2228]">
            <button
              id="btn-edit-md-profile"
              onClick={() => setIsEditingMd(true)}
              className="flex items-center gap-1 bg-[#14171c] hover:bg-[#1a1e24] border border-[#262930] px-2 py-1 rounded text-xs text-neutral-300 transition"
              title="Ganti Nama MD / Profil"
            >
              <UserIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="font-medium max-w-[65px] sm:max-w-[100px] truncate">{userProfile.displayName}</span>
            </button>

            {currentUser ? (
              <button
                id="btn-auth-logout"
                onClick={logout}
                className="p-1.5 rounded bg-[#14171c] hover:bg-neutral-800 text-neutral-400 hover:text-white border border-[#262930]"
                title="Keluar Google"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                id="btn-auth-google-login"
                onClick={signInWithGoogle}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-[#14171c] hover:bg-neutral-800 text-[11px] font-semibold text-neutral-300 border border-[#262930]"
                title="Sign in with Google (Opsional)"
              >
                <LogIn className="w-3 h-3" />
                <span>Google</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Sub-navigation (Visible when Admin role is active) */}
      {role === 'admin' && (
        <div className="bg-[#121418] border-t border-[#1f2228]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 h-11 overflow-x-auto">
            <span className="text-[10px] font-mono uppercase text-neutral-500 mr-2 tracking-wider">ADMIN MODUL:</span>
            
            <button
              id="tab-admin-stores"
              onClick={() => setActiveAdminTab('stores')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
                activeAdminTab === 'stores'
                  ? 'bg-[#262930] text-white border border-neutral-600'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-red-500" />
              <span>Jadwal & Rute Toko</span>
            </button>

            <button
              id="tab-admin-items"
              onClick={() => setActiveAdminTab('items')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
                activeAdminTab === 'items'
                  ? 'bg-[#262930] text-white border border-neutral-600'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-500" />
              <span>Master Barang & Harga</span>
            </button>

            <button
              id="tab-admin-logs"
              onClick={() => setActiveAdminTab('logs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
                activeAdminTab === 'logs'
                  ? 'bg-[#262930] text-white border border-neutral-600'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Laporan Kunjungan (Visit Logs)</span>
            </button>
          </div>
        </div>
      )}

      {/* Merchandiser Quick Helper Sub-bar */}
      {role === 'merchandiser' && (
        <div className="bg-[#121418] border-t border-[#1f2228] px-3 sm:px-6 py-1.5 flex items-center justify-between gap-1 text-[11px] text-neutral-400 font-mono w-full">
          <div className="flex items-center gap-1.5 truncate max-w-full min-w-0">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
            <span className="truncate">PETUGAS: <strong className="text-white">{userProfile.displayName} ({userProfile.mdCode || 'MD-01'})</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingMd(true)}
            className="text-[10px] text-neutral-400 hover:text-white underline underline-offset-2 shrink-0"
          >
            Ubah Profil
          </button>
        </div>
      )}

      {/* MD Name Edit Modal */}
      {isEditingMd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-lg bg-[#14171d] border border-neutral-700 p-5 text-white shadow-2xl">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Identitas Petugas MD</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Nama ini akan dicantumkan secara otomatis pada setiap formulir Check-In toko dan Laporan Sell-Out.
            </p>
            <form onSubmit={handleSaveMdName} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Nama Merchandiser</label>
                <input
                  type="text"
                  value={tempMdName}
                  onChange={(e) => setTempMdName(e.target.value)}
                  className="w-full bg-[#0a0b0d] border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-hidden focus:border-red-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMd(false)}
                  className="w-1/2 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold uppercase rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-red-600 hover:bg-red-500 text-xs font-bold uppercase rounded text-white"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
