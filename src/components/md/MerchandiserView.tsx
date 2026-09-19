import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  MapPin, 
  ExternalLink, 
  Clock, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Calendar,
  CheckCircle,
  Play,
  Filter,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { Store, Item, VisitLog, DayOfWeek } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DAYS_OF_WEEK, getTodayIndonesianDay } from '../../services/storeService';
import { ActiveVisitModal } from './ActiveVisitModal';
import { formatCurrencyIDR } from '../../services/itemService';

interface MerchandiserViewProps {
  stores: Store[];
  items: Item[];
  visits: VisitLog[];
  onRefresh: () => void;
}

export const MerchandiserView: React.FC<MerchandiserViewProps> = ({
  stores,
  items,
  visits,
  onRefresh
}) => {
  const { userProfile } = useAuth();
  const todayDay = getTodayIndonesianDay();

  // Default only displays the current running day
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [isOtherDaysOpen, setIsOtherDaysOpen] = useState<boolean>(false);
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [activeStoreForVisit, setActiveStoreForVisit] = useState<Store | null>(null);

  // Filter stores for the selected day (supporting 2x a week schedule via visitDays), sorted by visitOrder asc
  const dayStores = stores
    .filter(s => (s.visitDays && s.visitDays.length > 0 ? s.visitDays.includes(selectedDay) : s.visitDay === selectedDay))
    .sort((a, b) => a.visitOrder - b.visitOrder);

  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Map of completed visits for today: storeId -> VisitLog
  const completedVisitsMap = new Map<string, VisitLog>();
  const inProgressVisitsMap = new Map<string, VisitLog>();

  visits.forEach(v => {
    // If visit is for today (or matches store on current date)
    const isToday = v.visitDate === todayStr || v.checkInTime?.startsWith(todayStr);
    if (isToday) {
      if (v.status === 'completed') {
        completedVisitsMap.set(v.storeId, v);
      } else if (v.status === 'in_progress') {
        inProgressVisitsMap.set(v.storeId, v);
      }
    }
  });

  // Calculate Strict Priority Locks:
  // Store at index 0 is always unlocked.
  // Store at index i > 0 is unlocked ONLY IF all stores at indices < i are completed!
  let allPreviousCompleted = true;
  const storeStatuses = dayStores.map((store, index) => {
    const isCompleted = completedVisitsMap.has(store.id);
    const isInProgress = inProgressVisitsMap.has(store.id);
    
    // Strict priority lock logic
    const isLocked = !allPreviousCompleted && !isCompleted && !isInProgress;

    if (!isCompleted) {
      allPreviousCompleted = false;
    }

    return {
      store,
      isCompleted,
      isInProgress,
      isLocked,
      order: store.visitOrder || (index + 1),
      visitLog: completedVisitsMap.get(store.id) || inProgressVisitsMap.get(store.id)
    };
  });

  const visibleStores = hideCompleted 
    ? storeStatuses.filter(s => !s.isCompleted)
    : storeStatuses;

  const totalStoresToday = dayStores.length;
  const completedCount = storeStatuses.filter(s => s.isCompleted).length;
  const isViewingDifferentDay = selectedDay !== todayDay;

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* 1. Permanent Mandatory MDS System Alert Banner (Bersifat Permanen) */}
      <div 
        id="mds-system-alert"
        className="bg-red-950/80 border-2 border-red-600 rounded-lg p-3 sm:p-4 text-white shadow-xl w-full"
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded bg-red-600 text-white shrink-0 mt-0.5 font-bold">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider text-red-300">
                  PERINGATAN SISTEM WAJIB (MDS FIELD ALERT)
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 bg-red-500 text-black font-bold rounded">
                  SOP LAPANGAN WAJIB
                </span>
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
              Wajib Lapor Aplikasi MDS Setiap Jam Kunjungan Toko!
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-300 leading-relaxed break-words">
              Petugas Merchandiser (MD) wajib Check-in &amp; Check-out di aplikasi MDS secara berurutan sesuai Rute Terkunci (Urutan Prioritas 1 s/d 6). Pastikan stok opname fisik (Dus/Box/Pcs) dan catatan penjualan (Sell-Out) telah diinput sebelum check-out toko.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Operational Control Header: Default Current Day + Button to Check Other Days */}
      <div className="bg-[#121418] border border-[#1f2228] rounded-lg p-4 space-y-3">
        {/* Main Day Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Day Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
              <Calendar className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-neutral-400">
                {isViewingDifferentDay ? 'JADWAL HARI TERPILIH' : 'HARI SEDANG BERJALAN (DEFAULT)'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold font-mono text-white uppercase tracking-wider">
                  {selectedDay}
                </span>
                {!isViewingDifferentDay ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                    HARI INI (AKTIF)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                    BUKAN HARI BERJALAN
                  </span>
                )}
                <span className="text-xs font-mono text-neutral-400">
                  ({totalStoresToday} Toko)
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* If viewing a different day, offer quick return to today */}
            {isViewingDifferentDay && (
              <button
                id="btn-return-today"
                onClick={() => {
                  setSelectedDay(todayDay);
                  setIsOtherDaysOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kembali ke Hari Ini ({todayDay})</span>
              </button>
            )}

            {/* Button to toggle other days selector */}
            <button
              id="btn-toggle-other-days"
              onClick={() => setIsOtherDaysOpen(!isOtherDaysOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider border transition ${
                isOtherDaysOpen
                  ? 'bg-red-600 text-white border-red-500 shadow-sm'
                  : 'bg-[#0a0b0d] text-neutral-300 hover:text-white border-[#262930] hover:border-neutral-600'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-red-400" />
              <span>{isOtherDaysOpen ? 'Tutup Pilihan Hari' : 'Cek Hari Lain'}</span>
              {isOtherDaysOpen ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {/* Toggle Hide Completed */}
            <button
              id="toggle-hide-completed"
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold uppercase tracking-wider border transition ${
                hideCompleted
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : 'bg-[#0a0b0d] text-neutral-400 hover:text-neutral-200 border-[#262930]'
              }`}
            >
              {hideCompleted ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{hideCompleted ? 'Tampilkan Semua' : 'Sembunyikan Selesai'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Day Selector for checking other days */}
        {isOtherDaysOpen && (
          <div className="pt-3 border-t border-[#1f2228] space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <span>PILIH HARI UNTUK CEK JADWAL TOKO LAIN:</span>
              <span className="text-neutral-500">Hari berjalan saat ini: <strong className="text-emerald-400">{todayDay}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {DAYS_OF_WEEK.map((d) => {
                const countForDay = stores.filter(s => (s.visitDays && s.visitDays.length > 0 ? s.visitDays.includes(d) : s.visitDay === d)).length;
                const isDayToday = todayDay === d;
                const isSelected = selectedDay === d;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setSelectedDay(d);
                    }}
                    className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-sm ring-1 ring-white/20'
                        : isDayToday
                        ? 'bg-[#18201a] text-emerald-300 border border-emerald-800/80 hover:bg-emerald-950'
                        : 'bg-[#0a0b0d] text-neutral-400 hover:text-white border border-[#262930]'
                    }`}
                  >
                    <span>{d}</span>
                    {isDayToday && (
                      <span className="px-1 py-0.2 bg-emerald-900 text-emerald-300 text-[9px] font-bold rounded">
                        HARI INI
                      </span>
                    )}
                    <span className="text-[10px] opacity-75 font-normal">({countForDay})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Route Progress Bar */}
        <div className="pt-2 border-t border-[#1f2228] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 uppercase">PROGRES RUTE {selectedDay.toUpperCase()}:</span>
            <span className="font-bold text-white">
              {completedCount} dari {totalStoresToday} Toko Selesai ({totalStoresToday > 0 ? Math.round((completedCount / totalStoresToday) * 100) : 0}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-36 h-2 bg-[#0a0b0d] rounded-full overflow-hidden border border-[#262930]">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${totalStoresToday > 0 ? (completedCount / totalStoresToday) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="text-[11px] text-neutral-400 font-bold">RUTE TERKUNCI AKTIF</span>
          </div>
        </div>
      </div>

      {/* 3. Strict Priority Route List (Rute Terkunci) */}
      <div className="space-y-2.5 w-full">
        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs font-mono uppercase text-neutral-400 px-1">
          <span>Daftar Urutan Kunjungan (Prioritas 1 → 6)</span>
          <span className="hidden xs:inline">Status Rute &amp; Tindakan</span>
        </div>

        {visibleStores.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-[#0a0b0d] border border-dashed border-[#262930] rounded-lg text-neutral-500 text-xs font-mono space-y-2">
            <div>Tidak ada jadwal toko untuk hari {selectedDay} (atau semua toko telah disembunyikan).</div>
            <div className="text-neutral-600">Gunakan tab Admin untuk menambahkan toko dan menetapkan prioritas kunjungan.</div>
          </div>
        ) : (
          visibleStores.map(({ store, isCompleted, isInProgress, isLocked, order, visitLog }) => {
            return (
              <div
                key={store.id}
                className={`p-3.5 sm:p-4 rounded-lg border transition w-full ${
                  isInProgress
                    ? 'bg-[#14171d] border-red-500 shadow-md ring-1 ring-red-500/50'
                    : isCompleted
                    ? 'bg-[#0a0b0d]/70 border-emerald-900/50 opacity-90'
                    : isLocked
                    ? 'bg-[#0d0e12] border-neutral-800 opacity-60'
                    : 'bg-[#121418] border-neutral-700 hover:border-neutral-500 shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                  {/* Left: Priority Badge & Store Info */}
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div 
                      className={`w-10 h-10 rounded flex flex-col items-center justify-center font-mono shrink-0 border ${
                        isCompleted
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : isInProgress
                          ? 'bg-red-600 text-white border-red-500 font-bold animate-pulse'
                          : isLocked
                          ? 'bg-neutral-900 text-neutral-500 border-neutral-800'
                          : 'bg-neutral-800 text-white border-neutral-700 font-bold'
                      }`}
                    >
                      <span className="text-[9px] uppercase tracking-tighter opacity-80">ORDER</span>
                      <span className="text-base font-black leading-none">{order}</span>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white font-sans break-words">
                          {store.name}
                        </h4>

                        {/* Visit Days schedule badge */}
                        {store.visitDays && store.visitDays.length > 0 ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e232d] text-neutral-300 border border-neutral-700">
                            Jadwal: {store.visitDays.join(' & ')} {store.visitDays.length >= 2 ? '(2x/mgg)' : ''}
                          </span>
                        ) : store.visitDay ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e232d] text-neutral-300 border border-neutral-700">
                            Jadwal: {store.visitDay}
                          </span>
                        ) : null}
                        
                        {/* Status Badges */}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            SELESAI (CHECK-OUT)
                          </span>
                        )}
                        {isInProgress && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 animate-pulse font-bold">
                            <Clock className="w-3 h-3" />
                            SEDANG DIKUNJUNGI
                          </span>
                        )}
                        {isLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                            <Lock className="w-3 h-3 text-neutral-500" />
                            TERKUNCI (Selesaikan Toko Sebelumnya)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        {store.location ? (
                          <span className="truncate max-w-xs sm:max-w-md">{store.location}</span>
                        ) : (
                          <span className="text-neutral-500 italic">Alamat belum ditentukan (opsional)</span>
                        )}
                        {store.mapsUrl && (
                          <a
                            href={store.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 hover:text-red-300 inline-flex items-center gap-0.5 text-[11px] font-mono"
                            title="Buka di Google Maps"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Maps
                          </a>
                        )}
                      </div>

                      {/* Store Stock & Visit Summary */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                        {(store.currentStock && store.currentStock.length > 0) || (visitLog?.stockEntries && visitLog.stockEntries.length > 0) ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            Stok Toko: {store.currentStock?.length || visitLog?.stockEntries?.length || 0} Produk Tercatat
                          </span>
                        ) : (
                          <span className="text-neutral-500">
                            Stok toko belum tercatat
                          </span>
                        )}

                        {isCompleted && visitLog && (
                          <div className="text-neutral-400 flex items-center gap-3">
                            <span>Check-in: <strong className="text-white">{visitLog.checkInTime ? new Date(visitLog.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</strong></span>
                            <span>Check-out: <strong className="text-white">{visitLog.checkOutTime ? new Date(visitLog.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</strong></span>
                            <span>Sell-Out: <strong className="text-amber-400">{formatCurrencyIDR(visitLog.totalSellOutAmount || 0)}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Operational Visit Button */}
                  <div className="flex items-center justify-end">
                    {isLocked ? (
                      <button
                        disabled
                        className="w-full sm:w-auto px-4 py-2.5 rounded bg-neutral-900/90 text-neutral-500 text-xs font-mono font-bold uppercase tracking-wider border border-neutral-800 flex items-center justify-center gap-2 cursor-not-allowed"
                        title="Toko terkunci. Wajib menyelesaikan toko pada urutan sebelumnya terlebih dahulu."
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Rute Terkunci (Urutan {order})</span>
                      </button>
                    ) : isCompleted ? (
                      <button
                        onClick={() => setActiveStoreForVisit(store)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono font-bold uppercase tracking-wider border border-neutral-700 flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Lihat Rangkuman</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveStoreForVisit(store)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isInProgress ? 'Lanjutkan Kunjungan' : 'Mulai Kunjungan Toko'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Visit Modal (Stock Opname, Sell-Out & Check-out) */}
      {activeStoreForVisit && (
        <ActiveVisitModal
          isOpen={true}
          store={activeStoreForVisit}
          mdName={userProfile?.displayName || 'Merchandiser'}
          items={items}
          activeVisitId={inProgressVisitsMap.get(activeStoreForVisit.id)?.id || null}
          existingVisit={completedVisitsMap.get(activeStoreForVisit.id) || inProgressVisitsMap.get(activeStoreForVisit.id)}
          allVisits={visits}
          onClose={() => {
            setActiveStoreForVisit(null);
            onRefresh();
          }}
          onVisitCompleted={() => {
            setActiveStoreForVisit(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
