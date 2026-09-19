import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Store as StoreIcon, 
  TrendingUp, 
  DollarSign,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Layers,
  Trash2,
  Building2,
  Package,
  MapPin,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { VisitLog, Store, Item, StockOpnameEntry } from '../../types';
import { formatCurrencyIDR, convertPcsToBreakdown } from '../../services/itemService';
import { visitService } from '../../services/visitService';

interface VisitLogsViewProps {
  visits: VisitLog[];
  stores: Store[];
  items: Item[];
  onVisitsChanged: () => void;
}

// Helper to extract separated physical stock for a specific store
function getStoreStockData(store: Store, visits: VisitLog[]): {
  entries: StockOpnameEntry[];
  lastUpdated: string | null;
  recordedBy: string | null;
} {
  if (store.currentStock && store.currentStock.length > 0) {
    return {
      entries: store.currentStock,
      lastUpdated: store.lastStockUpdated || store.updatedAt || null,
      recordedBy: store.lastStockUpdatedBy || 'Petugas MD'
    };
  }

  // Fallback to latest visit for this specific store
  const storeVisits = visits.filter(v => v.storeId === store.id && v.stockEntries && v.stockEntries.length > 0);
  storeVisits.sort((a, b) => 
    new Date(b.checkOutTime || b.createdAt || 0).getTime() - 
    new Date(a.checkOutTime || a.createdAt || 0).getTime()
  );

  if (storeVisits.length > 0) {
    const latest = storeVisits[0];
    return {
      entries: latest.stockEntries,
      lastUpdated: latest.checkOutTime || latest.createdAt || null,
      recordedBy: latest.mdName
    };
  }

  return {
    entries: [],
    lastUpdated: null,
    recordedBy: null
  };
}

export const VisitLogsView: React.FC<VisitLogsViewProps> = ({
  visits,
  stores,
  items,
  onVisitsChanged
}) => {
  // View mode: 'logs' = visit session logs, 'store_stocks' = separated physical stock per store
  const [viewMode, setViewMode] = useState<'logs' | 'store_stocks'>('store_stocks');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || '');
  
  // Logs filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState('Semua');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('Semua');
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedVisitId(expandedVisitId === id ? null : id);
  };

  // Metrics
  const totalVisitsCount = visits.length;
  const completedVisits = visits.filter(v => v.status === 'completed');
  const completedCount = completedVisits.length;
  const totalSellOutRevenue = visits.reduce((sum, v) => sum + (v.totalSellOutAmount || 0), 0);

  // Filtered Visits for 'logs' mode
  const filteredVisits = visits.filter(v => {
    const matchDay = selectedDayFilter === 'Semua' || v.visitDay === selectedDayFilter;
    const matchStore = selectedStoreFilter === 'Semua' || v.storeId === selectedStoreFilter;
    const q = searchQuery.toLowerCase();
    const matchQuery = 
      v.storeName.toLowerCase().includes(q) ||
      v.mdName.toLowerCase().includes(q) ||
      (v.notes && v.notes.toLowerCase().includes(q));
    return matchDay && matchStore && matchQuery;
  });

  // Selected store for 'store_stocks' mode
  const currentStore = stores.find(s => s.id === selectedStoreId) || stores[0];
  const currentStoreStock = currentStore ? getStoreStockData(currentStore, visits) : { entries: [], lastUpdated: null, recordedBy: null };

  // Calculate metrics for selected store's stock
  const currentStoreTotalPcs = currentStoreStock.entries.reduce((sum, e) => sum + e.totalPcs, 0);
  const currentStoreEstimatedValue = currentStoreStock.entries.reduce((sum, e) => {
    const it = items.find(i => i.id === e.itemId);
    return sum + (e.totalPcs * (it?.pricePcs || 0));
  }, 0);

  // Export to CSV Function for Visit Logs
  const exportToCSV = () => {
    if (visits.length === 0) return;

    const rows: string[][] = [
      ['ID Kunjungan', 'Tanggal', 'Hari', 'Petugas MD', 'Nama Toko', 'Lokasi', 'Waktu Check-In', 'Waktu Check-Out', 'Total Sell-Out (IDR)', 'Status', 'Catatan']
    ];

    visits.forEach(v => {
      rows.push([
        v.id,
        v.visitDate,
        v.visitDay,
        `"${v.mdName}"`,
        `"${v.storeName}"`,
        `"${v.storeLocation || ''}"`,
        v.checkInTime || '',
        v.checkOutTime || '',
        String(v.totalSellOutAmount || 0),
        v.status,
        `"${v.notes || ''}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MD_SYS_Visit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export single store's stock to CSV
  const exportStoreStockToCSV = () => {
    if (!currentStore || currentStoreStock.entries.length === 0) return;

    const rows: string[][] = [
      ['Nama Toko', 'Lokasi', 'Hari Kunjungan', 'Barcode', 'Nama Barang', 'Kuantitas Input', 'Satuan Input', 'Total Pcs Fisik', 'Estimasi Nilai (IDR)', 'Waktu Update Terakhir', 'Petugas MD']
    ];

    currentStoreStock.entries.forEach(e => {
      const it = items.find(i => i.id === e.itemId);
      const val = e.totalPcs * (it?.pricePcs || 0);
      rows.push([
        `"${currentStore.name}"`,
        `"${currentStore.location || ''}"`,
        currentStore.visitDay || (currentStore.visitDays ? currentStore.visitDays.join(' & ') : ''),
        e.barcode,
        `"${e.itemName}"`,
        String(e.inputQty),
        e.inputUnit,
        String(e.totalPcs),
        String(val),
        currentStoreStock.lastUpdated || '',
        `"${currentStoreStock.recordedBy || ''}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeStoreName = currentStore.name.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `Stok_Toko_${safeStoreName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteVisit = async (id: string, storeName: string) => {
    if (window.confirm(`Hapus log kunjungan toko "${storeName}"?`)) {
      try {
        await visitService.deleteVisit(id);
        onVisitsChanged();
      } catch (err) {
        console.error('Failed to delete visit:', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Main Mode Switcher: Store Stock vs Visit Logs */}
      <div className="bg-[#121418] border border-[#1f2228] p-1.5 rounded-lg flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode('store_stocks')}
            className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition ${
              viewMode === 'store_stocks'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stok Fisik Terpisah Tiap Toko</span>
          </button>
          <button
            onClick={() => setViewMode('logs')}
            className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition ${
              viewMode === 'logs'
                ? 'bg-neutral-700 text-white shadow-md'
                : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Log Sesi Kunjungan Toko</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-neutral-400 px-2">
          {viewMode === 'store_stocks' ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Stok setiap toko terisolasi &amp; tidak digabung
            </span>
          ) : (
            <span>Total Kunjungan: {visits.length} Sesi</span>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: STOK FISIK TERPISAH TIAP TOKO */}
      {viewMode === 'store_stocks' && (
        <div className="space-y-4">
          {/* Store Selector Strip */}
          <div className="bg-[#121418] border border-[#1f2228] rounded-lg p-3">
            <div className="text-[11px] font-mono text-neutral-400 uppercase mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-red-500" />
              <span>Pilih Toko untuk Melihat Stok Fisik Terpisah:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {stores.map(st => {
                const isSelected = st.id === selectedStoreId;
                const stockData = getStoreStockData(st, visits);
                const hasStock = stockData.entries.length > 0;

                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStoreId(st.id)}
                    className={`p-2.5 rounded text-left border transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-red-950/40 border-red-500 text-white ring-1 ring-red-500/50'
                        : 'bg-[#0a0b0d] border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="font-bold text-neutral-300">
                          #{st.visitOrder} • {st.visitDays && st.visitDays.length > 0 ? st.visitDays.join('/') : st.visitDay}
                        </span>
                        <span className={`px-1 rounded text-[9px] ${hasStock ? 'bg-emerald-950 text-emerald-400' : 'bg-neutral-900 text-neutral-500'}`}>
                          {hasStock ? `${stockData.entries.length} Item` : '0 Item'}
                        </span>
                      </div>
                      <div className="text-xs font-bold font-sans truncate" title={st.name}>
                        {st.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Store Stock Card */}
          {currentStore ? (
            <div className="bg-[#121418] border border-[#1f2228] rounded-lg p-4 sm:p-5 space-y-4">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold uppercase">
                      PRIORITAS #{currentStore.visitOrder} • {currentStore.visitDays && currentStore.visitDays.length > 0 ? currentStore.visitDays.join(' & ') : currentStore.visitDay}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-[10px]">
                      STOK TERPISAH KHUSUS TOKO
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-red-500" />
                    <span>{currentStore.name}</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span>{currentStore.location || 'Alamat belum ditentukan (opsional)'}</span>
                    {currentStore.contactPerson && (
                      <span>• Kontak: {currentStore.contactPerson} ({currentStore.phone || '-'})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={exportStoreStockToCSV}
                    disabled={currentStoreStock.entries.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-mono font-bold uppercase rounded border border-neutral-700 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ekspor Stok Toko Ini (CSV)</span>
                  </button>
                </div>
              </div>

              {/* Notice that stock is strictly separated */}
              <div className="p-3 rounded bg-[#0a0b0d] border border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Daftar stok fisik di bawah ini adalah catatan tersendiri milik <strong>{currentStore.name}</strong>, tidak digabung atau tercampur dengan toko lainnya.
                  </span>
                </div>
                {currentStoreStock.lastUpdated && (
                  <div className="text-[11px] text-neutral-400 shrink-0">
                    Pembaruan: {new Date(currentStoreStock.lastUpdated).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} oleh {currentStoreStock.recordedBy}
                  </div>
                )}
              </div>

              {/* Metrics for this specific store */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded bg-[#0a0b0d] border border-neutral-800">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Jumlah Produk Tercatat</span>
                  <span className="text-xl font-mono font-bold text-white mt-1 block">
                    {currentStoreStock.entries.length} Produk
                  </span>
                </div>
                <div className="p-3.5 rounded bg-[#0a0b0d] border border-neutral-800">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Total Unit Fisik di Toko</span>
                  <span className="text-xl font-mono font-bold text-blue-400 mt-1 block">
                    {currentStoreTotalPcs} Pcs
                  </span>
                </div>
                <div className="p-3.5 rounded bg-[#0a0b0d] border border-neutral-800">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Estimasi Nilai Stok Toko Ini</span>
                  <span className="text-xl font-mono font-bold text-amber-400 mt-1 block">
                    {formatCurrencyIDR(currentStoreEstimatedValue)}
                  </span>
                </div>
              </div>

              {/* Table of Stock for this store */}
              {currentStoreStock.entries.length === 0 ? (
                <div className="p-8 text-center bg-[#0a0b0d] border border-dashed border-neutral-800 rounded text-neutral-500 text-xs font-mono">
                  Belum ada catatan stok fisik untuk toko {currentStore.name}.
                </div>
              ) : (
                <div className="overflow-x-auto border border-neutral-800 rounded bg-[#0a0b0d]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#14171d] text-neutral-400 border-b border-neutral-800">
                      <tr>
                        <th className="py-2.5 px-3">Nama Produk</th>
                        <th className="py-2.5 px-3">Barcode</th>
                        <th className="py-2.5 px-3">Input Fisik</th>
                        <th className="py-2.5 px-3">Konversi 3 Satuan</th>
                        <th className="py-2.5 px-3 text-right">Total Fisik (Pcs)</th>
                        <th className="py-2.5 px-3 text-right">Estimasi Nilai (IDR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                      {currentStoreStock.entries.map((stk, idx) => {
                        const itemObj = items.find(i => i.id === stk.itemId);
                        const breakdown = itemObj
                          ? convertPcsToBreakdown(stk.totalPcs, itemObj.boxPerDus, itemObj.pcsPerBox)
                          : { display: `${stk.totalPcs} Pcs` };
                        const estValue = stk.totalPcs * (itemObj?.pricePcs || 0);

                        return (
                          <tr key={idx} className="hover:bg-[#121418] transition">
                            <td className="py-2.5 px-3 font-bold text-white font-sans">
                              {stk.itemName}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-400">
                              {stk.barcode}
                            </td>
                            <td className="py-2.5 px-3 text-amber-300 font-bold">
                              {stk.inputQty} {stk.inputUnit}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-300">
                              {breakdown.display}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-white">
                              {stk.totalPcs} Pcs
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                              {formatCurrencyIDR(estValue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-neutral-500 font-mono text-xs">
              Pilih salah satu toko di atas.
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: LOG SESI KUNJUNGAN */}
      {viewMode === 'logs' && (
        <div className="space-y-4">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-[#121418] border border-[#1f2228] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">Total Kunjungan Toko</span>
                <span className="text-xl font-mono font-bold text-white mt-1 block">{totalVisitsCount} Sesi</span>
              </div>
              <div className="p-2 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                <StoreIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#121418] border border-[#1f2228] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">Kunjungan Selesai (Check-Out)</span>
                <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">
                  {completedCount} ({totalVisitsCount > 0 ? Math.round((completedCount / totalVisitsCount) * 100) : 0}%)
                </span>
              </div>
              <div className="p-2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#121418] border border-[#1f2228] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">Total Omset Sell-Out Tercatat</span>
                <span className="text-xl font-mono font-bold text-amber-400 mt-1 block">
                  {formatCurrencyIDR(totalSellOutRevenue)}
                </span>
              </div>
              <div className="p-2 rounded bg-amber-950/60 text-amber-400 border border-amber-900">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter and Export Bar */}
          <div className="bg-[#121418] border border-[#1f2228] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari toko, petugas MD, catatan..."
                className="w-full bg-[#0a0b0d] border border-[#262930] rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Store Filter - lets user isolate logs to one store */}
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                className="bg-[#0a0b0d] border border-[#262930] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden"
              >
                <option value="Semua">Semua Toko</option>
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>

              <select
                value={selectedDayFilter}
                onChange={(e) => setSelectedDayFilter(e.target.value)}
                className="bg-[#0a0b0d] border border-[#262930] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden"
              >
                <option value="Semua">Semua Hari</option>
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
                <option value="Sabtu">Sabtu</option>
                <option value="Minggu">Minggu</option>
              </select>

              <button
                onClick={exportToCSV}
                disabled={visits.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-mono font-bold uppercase rounded border border-neutral-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="space-y-2.5">
            {filteredVisits.length === 0 ? (
              <div className="p-12 text-center bg-[#0a0b0d] border border-dashed border-[#262930] rounded-lg text-neutral-500 text-xs font-mono">
                Belum ada data kunjungan yang sesuai dengan filter.
              </div>
            ) : (
              filteredVisits.map(visit => {
                const isExpanded = expandedVisitId === visit.id;
                return (
                  <div 
                    key={visit.id}
                    className="bg-[#121418] border border-[#1f2228] hover:border-neutral-700 rounded-lg overflow-hidden transition"
                  >
                    {/* Summary Row */}
                    <div 
                      onClick={() => toggleExpand(visit.id)}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded bg-[#171a22] border border-neutral-700 text-white shrink-0 font-mono text-xs flex flex-col items-center justify-center">
                          <Calendar className="w-3.5 h-3.5 text-red-500 mb-0.5" />
                          <span className="font-bold">{visit.visitDay.slice(0, 3)}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white font-sans">
                              {visit.storeName}
                            </h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              visit.status === 'completed'
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                : 'bg-red-950 text-red-400 border-red-800'
                            }`}>
                              {visit.status === 'completed' ? 'CHECK-OUT SELESAI' : 'SEDANG DIKUNJUNGI'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono mt-1">
                            <span>MD: <strong className="text-neutral-200">{visit.mdName}</strong></span>
                            <span>Tgl: {visit.visitDate}</span>
                            {visit.checkInTime && (
                              <span>Masuk: {new Date(visit.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                            {visit.checkOutTime && (
                              <span>Keluar: {new Date(visit.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-800">
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-neutral-400 block uppercase">Sell-Out Toko</span>
                          <span className="text-sm font-bold text-amber-400">
                            {formatCurrencyIDR(visit.totalSellOutAmount || 0)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVisit(visit.id, visit.storeName);
                            }}
                            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition"
                            title="Hapus Kunjungan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="border-t border-neutral-800 bg-[#0d0e12] p-4 space-y-4">
                        {/* Notes */}
                        {visit.notes && (
                          <div className="text-xs font-mono p-2.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                            <span className="text-neutral-400 font-bold">Catatan Kunjungan: </span>
                            {visit.notes}
                          </div>
                        )}

                        {/* Stock Opname Recorded for this visit */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-neutral-300 mb-2">
                            <Layers className="w-3.5 h-3.5 text-red-500" />
                            <span>Stok Fisik Toko ({visit.stockEntries?.length || 0} Item)</span>
                          </div>

                          {(!visit.stockEntries || visit.stockEntries.length === 0) ? (
                            <div className="text-xs font-mono text-neutral-500 italic p-2 bg-neutral-950 rounded">
                              Tidak ada data stok fisik tercatat pada kunjungan ini.
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-neutral-800 rounded bg-[#121418]">
                              <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-[#0a0b0d] text-neutral-400 border-b border-neutral-800">
                                  <tr>
                                    <th className="py-2 px-3">Item</th>
                                    <th className="py-2 px-3">Barcode</th>
                                    <th className="py-2 px-3">Input MD</th>
                                    <th className="py-2 px-3">Total Terhitung (Pcs)</th>
                                    <th className="py-2 px-3">Stok Lalu Toko Ini</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                                  {visit.stockEntries.map((stk, idx) => {
                                    const itemObj = items.find(i => i.id === stk.itemId);
                                    const breakdown = itemObj
                                      ? convertPcsToBreakdown(stk.totalPcs, itemObj.boxPerDus, itemObj.pcsPerBox)
                                      : { display: `${stk.totalPcs} Pcs` };

                                    return (
                                      <tr key={idx}>
                                        <td className="py-2 px-3 text-white font-sans font-medium">{stk.itemName}</td>
                                        <td className="py-2 px-3 text-neutral-400">{stk.barcode}</td>
                                        <td className="py-2 px-3 text-amber-300">{stk.inputQty} {stk.inputUnit}</td>
                                        <td className="py-2 px-3 font-bold text-white">
                                          {stk.totalPcs} Pcs <span className="text-neutral-400 font-normal">({breakdown.display})</span>
                                        </td>
                                        <td className="py-2 px-3 text-neutral-400">{stk.lastWeekPcs} Pcs</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Sell-Out Transactions Table */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-neutral-300 mb-2">
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                            <span>Transaksi Sell-Out ({visit.sellOutRecords?.length || 0} Record)</span>
                          </div>

                          {(!visit.sellOutRecords || visit.sellOutRecords.length === 0) ? (
                            <div className="text-xs font-mono text-neutral-500 italic p-2 bg-neutral-950 rounded">
                              Tidak ada transaksi penjualan sell-out dicatat.
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-neutral-800 rounded bg-[#121418]">
                              <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-[#0a0b0d] text-neutral-400 border-b border-neutral-800">
                                  <tr>
                                    <th className="py-2 px-3">Waktu</th>
                                    <th className="py-2 px-3">Customer</th>
                                    <th className="py-2 px-3">Item &amp; Kuantitas</th>
                                    <th className="py-2 px-3 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                                  {visit.sellOutRecords.map((rec, idx) => (
                                    <tr key={idx}>
                                      <td className="py-2 px-3 text-neutral-400">{rec.timestamp}</td>
                                      <td className="py-2 px-3 text-white font-sans font-bold">{rec.customerName}</td>
                                      <td className="py-2 px-3">
                                        {rec.items.map((line, lIdx) => (
                                          <div key={lIdx}>
                                            {line.itemName} ({line.qty} {line.unit} @ {formatCurrencyIDR(line.pricePerUnit)})
                                          </div>
                                        ))}
                                      </td>
                                      <td className="py-2 px-3 text-right font-bold text-amber-400">
                                        {formatCurrencyIDR(rec.totalAmount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
