import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  ExternalLink, 
  CheckCircle, 
  Scan, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  ClipboardList, 
  DollarSign, 
  AlertCircle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { Store, Item, UnitType, StockOpnameEntry, SellOutRecord, SellOutItem } from '../../types';
import { 
  convertToTotalPcs, 
  convertPcsToBreakdown, 
  getPriceForUnit, 
  formatCurrencyIDR 
} from '../../services/itemService';
import { getPreviousStockForStore, visitService } from '../../services/visitService';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { QuickItemRegisterModal } from './QuickItemRegisterModal';
import { VisitLog } from '../../types';

interface ActiveVisitModalProps {
  isOpen: boolean;
  store: Store;
  mdName: string;
  items: Item[];
  activeVisitId: string | null;
  existingVisit?: VisitLog | null;
  allVisits?: VisitLog[];
  onClose: () => void;
  onVisitCompleted: () => void;
}

export const ActiveVisitModal: React.FC<ActiveVisitModalProps> = ({
  isOpen,
  store,
  mdName,
  items,
  activeVisitId,
  existingVisit,
  allVisits = [],
  onClose,
  onVisitCompleted
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'sellout' | 'summary'>('stock');

  // Stock Opname Form State - strictly isolated to this specific store
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const [stockInputQty, setStockInputQty] = useState<string>('1');
  const [stockInputUnit, setStockInputUnit] = useState<UnitType>('Dus');
  const [stockEntries, setStockEntries] = useState<StockOpnameEntry[]>(() => {
    if (existingVisit?.stockEntries && existingVisit.stockEntries.length > 0) {
      return existingVisit.stockEntries;
    }
    if (store.currentStock && store.currentStock.length > 0) {
      return store.currentStock;
    }
    return [];
  });

  // Re-sync if store or existing visit changes
  useEffect(() => {
    if (existingVisit?.stockEntries && existingVisit.stockEntries.length > 0) {
      setStockEntries(existingVisit.stockEntries);
    } else if (store.currentStock && store.currentStock.length > 0) {
      setStockEntries(store.currentStock);
    } else {
      setStockEntries([]);
    }

    if (existingVisit?.sellOutRecords && existingVisit.sellOutRecords.length > 0) {
      setSellOutRecords(existingVisit.sellOutRecords);
    } else {
      setSellOutRecords([]);
    }
  }, [store.id, existingVisit?.id]);

  // Sell-Out Form State
  const [customerName, setCustomerName] = useState<string>(store.name);
  const [sellOutItemId, setSellOutItemId] = useState<string>(items[0]?.id || '');
  const [sellOutQty, setSellOutQty] = useState<string>('1');
  const [sellOutUnit, setSellOutUnit] = useState<UnitType>('Pcs');
  const [sellOutRecords, setSellOutRecords] = useState<SellOutRecord[]>(() => {
    return existingVisit?.sellOutRecords || [];
  });

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [unregisteredBarcode, setUnregisteredBarcode] = useState('');
  const [scannerTarget, setScannerTarget] = useState<'stock' | 'sellout'>('stock');

  // Barcode quick display & immediate feedback
  const [stockBarcodeInput, setStockBarcodeInput] = useState<string>('');
  const [sellOutBarcodeInput, setSellOutBarcodeInput] = useState<string>('');
  const [scanNotification, setScanNotification] = useState<{
    type: 'success' | 'new';
    barcode: string;
    itemName?: string;
  } | null>(null);

  // Visit status
  const [visitNotes, setVisitNotes] = useState(existingVisit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentSelectedItem = items.find(i => i.id === selectedItemId);
  const currentSellOutItem = items.find(i => i.id === sellOutItemId);

  // Synchronize barcode display whenever selected items change
  useEffect(() => {
    if (currentSelectedItem) {
      setStockBarcodeInput(currentSelectedItem.barcode);
    }
  }, [selectedItemId]);

  useEffect(() => {
    if (currentSellOutItem) {
      setSellOutBarcodeInput(currentSellOutItem.barcode);
    }
  }, [sellOutItemId]);

  if (!isOpen) return null;

  // Benchmarking previous visit stock for this specific store
  const mockLastWeekPcs = currentSelectedItem 
    ? getPreviousStockForStore(currentSelectedItem.id, store.id, allVisits) 
    : 0;
  
  const lastWeekBreakdown = currentSelectedItem 
    ? convertPcsToBreakdown(mockLastWeekPcs, currentSelectedItem.boxPerDus, currentSelectedItem.pcsPerBox)
    : { dus: 0, box: 0, pcs: 0, display: '0 Pcs' };

  // Current stock entry conversion preview
  const currentQtyNum = Math.max(0, parseInt(stockInputQty) || 0);
  const calculatedStockTotalPcs = currentSelectedItem 
    ? convertToTotalPcs(currentQtyNum, stockInputUnit, currentSelectedItem.boxPerDus, currentSelectedItem.pcsPerBox) 
    : 0;

  // Handle scanned barcode - immediately shows barcode on screen!
  const handleBarcodeScanned = (scannedBarcode: string) => {
    const cleanBarcode = scannedBarcode.trim();
    if (!cleanBarcode) return;

    const found = items.find(
      i => i.barcode.toLowerCase() === cleanBarcode.toLowerCase() || 
           cleanBarcode.toLowerCase().includes(i.barcode.toLowerCase()) || 
           i.barcode.toLowerCase().includes(cleanBarcode.toLowerCase())
    );

    if (found) {
      if (scannerTarget === 'stock') {
        setSelectedItemId(found.id);
        setStockBarcodeInput(found.barcode);
      } else {
        setSellOutItemId(found.id);
        setSellOutBarcodeInput(found.barcode);
      }
      setScanNotification({
        type: 'success',
        barcode: found.barcode,
        itemName: found.name
      });
    } else {
      // Barcode not registered! Automatically display barcode and open quick registration
      if (scannerTarget === 'stock') {
        setStockBarcodeInput(cleanBarcode);
      } else {
        setSellOutBarcodeInput(cleanBarcode);
      }
      setUnregisteredBarcode(cleanBarcode);
      setIsRegisterOpen(true);
      setScanNotification({
        type: 'new',
        barcode: cleanBarcode
      });
    }
  };

  // Direct manual/physical scanner barcode input
  const handleDirectBarcodeInput = (val: string, target: 'stock' | 'sellout') => {
    if (target === 'stock') {
      setStockBarcodeInput(val);
      const matched = items.find(i => i.barcode.toLowerCase() === val.trim().toLowerCase());
      if (matched) {
        setSelectedItemId(matched.id);
        setScanNotification({
          type: 'success',
          barcode: matched.barcode,
          itemName: matched.name
        });
      }
    } else {
      setSellOutBarcodeInput(val);
      const matched = items.find(i => i.barcode.toLowerCase() === val.trim().toLowerCase());
      if (matched) {
        setSellOutItemId(matched.id);
        setScanNotification({
          type: 'success',
          barcode: matched.barcode,
          itemName: matched.name
        });
      }
    }
  };

  // When MD registers new item on the spot
  const handleNewItemRegistered = (newItem: Item) => {
    if (scannerTarget === 'stock') {
      setSelectedItemId(newItem.id);
      setStockBarcodeInput(newItem.barcode);
    } else {
      setSellOutItemId(newItem.id);
      setSellOutBarcodeInput(newItem.barcode);
    }
    setScanNotification({
      type: 'success',
      barcode: newItem.barcode,
      itemName: newItem.name
    });
  };

  // Add Stock Entry
  const handleAddStockEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedItem || currentQtyNum <= 0) return;

    const existingIndex = stockEntries.findIndex(e => e.itemId === currentSelectedItem.id);
    const newEntry: StockOpnameEntry = {
      itemId: currentSelectedItem.id,
      barcode: currentSelectedItem.barcode,
      itemName: currentSelectedItem.name,
      inputQty: currentQtyNum,
      inputUnit: stockInputUnit,
      totalPcs: calculatedStockTotalPcs,
      lastWeekPcs: mockLastWeekPcs
    };

    if (existingIndex >= 0) {
      const updated = [...stockEntries];
      updated[existingIndex] = newEntry;
      setStockEntries(updated);
    } else {
      setStockEntries([...stockEntries, newEntry]);
    }

    setStockInputQty('1');
  };

  const handleRemoveStockEntry = (itemId: string) => {
    setStockEntries(stockEntries.filter(e => e.itemId !== itemId));
  };

  // Add Sell-Out Entry
  const sellOutQtyNum = Math.max(1, parseInt(sellOutQty) || 1);
  const sellOutUnitPrice = currentSellOutItem 
    ? getPriceForUnit(currentSellOutItem, sellOutUnit) 
    : 0;
  const sellOutLineSubtotal = sellOutQtyNum * sellOutUnitPrice;

  const handleAddSellOutRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMessage('Wajib mencantumkan Nama Customer (Toko / Pembeli).');
      return;
    }
    if (!currentSellOutItem || sellOutQtyNum <= 0) return;

    setErrorMessage(null);

    const lineItem: SellOutItem = {
      itemId: currentSellOutItem.id,
      barcode: currentSellOutItem.barcode,
      itemName: currentSellOutItem.name,
      qty: sellOutQtyNum,
      unit: sellOutUnit,
      pricePerUnit: sellOutUnitPrice,
      subtotal: sellOutLineSubtotal
    };

    const newRecord: SellOutRecord = {
      id: `so-${Date.now()}`,
      customerName: customerName.trim(),
      items: [lineItem],
      totalAmount: sellOutLineSubtotal,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setSellOutRecords([newRecord, ...sellOutRecords]);
    setSellOutQty('1');
  };

  const handleRemoveSellOutRecord = (id: string) => {
    setSellOutRecords(sellOutRecords.filter(r => r.id !== id));
  };

  const totalSellOutGrandTotal = sellOutRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  // Finalize Check-Out
  const handleCompleteCheckOut = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      let visitId = activeVisitId;
      if (!visitId) {
        visitId = await visitService.startVisit({
          storeId: store.id,
          storeName: store.name,
          storeLocation: store.location || '',
          mdId: 'md-user-01',
          mdName,
          visitDay: store.visitDay || (store.visitDays && store.visitDays[0]) || 'Senin',
          visitDate: new Date().toISOString().split('T')[0],
          checkInTime: new Date().toISOString(),
          status: 'in_progress',
          stockEntries: [],
          sellOutRecords: [],
          totalSellOutAmount: 0
        });
      }

      await visitService.completeVisit(
        visitId, 
        stockEntries, 
        sellOutRecords,
        visitNotes,
        store.id,
        mdName
      );

      onVisitCompleted();
      onClose();
    } catch (err) {
      console.error('Check-out failed:', err);
      setErrorMessage('Terjadi kendala saat menyimpan check-out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xs p-2 sm:p-4">
      <div className="w-full max-w-3xl rounded-lg bg-[#14171d] border border-neutral-700 shadow-2xl text-white overflow-hidden flex flex-col max-h-[95vh]">
        {/* Store Visit Header */}
        <div className="p-4 bg-[#0d0e12] border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                PRIORITAS #{store.visitOrder}
              </span>
              {store.visitDays && store.visitDays.length > 0 ? (
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">
                  {store.visitDays.join(' & ')} (2x/mgg)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">
                  {store.visitDay}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px]">
                SEDANG DIKUNJUNGI (IN-PROGRESS)
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">{store.name}</h2>
            {store.location ? (
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{store.location}</span>
                {store.mapsUrl && (
                  <a
                    href={store.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-red-400 hover:text-red-300 inline-flex items-center gap-0.5 text-[10px] font-mono"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    MAPS
                  </a>
                )}
              </div>
            ) : (
              <div className="text-xs text-neutral-500 italic mt-0.5">
                Alamat / Jalan belum ditentukan (opsional)
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded bg-neutral-800"
            title="Tutup / Simpan Draf"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-neutral-800 bg-[#101217] text-xs font-mono font-bold uppercase tracking-wider">
          <button
            id="tab-opname"
            onClick={() => setActiveTab('stock')}
            className={`py-3 px-2 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'stock'
                ? 'border-red-500 text-white bg-[#171a21]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-red-400" />
            <span>Cek Stok ({stockEntries.length})</span>
          </button>
          <button
            id="tab-sellout"
            onClick={() => setActiveTab('sellout')}
            className={`py-3 px-2 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'sellout'
                ? 'border-amber-500 text-white bg-[#171a21]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Sell-Out ({sellOutRecords.length})</span>
          </button>
          <button
            id="tab-summary"
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-2 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'summary'
                ? 'border-emerald-500 text-white bg-[#171a21]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Check-Out Toko</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Real-time Barcode Detection Banner (Muncul Langsung Saat Scan) */}
          {scanNotification && (
            <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 shadow-lg ${
              scanNotification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                : 'bg-amber-950/90 border-amber-500 text-amber-300'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-current shrink-0 animate-ping"></span>
                <div className="truncate">
                  {scanNotification.type === 'success' ? (
                    <span>
                      ✓ <strong>BARCODE TERDETEKSI:</strong> [{scanNotification.barcode}] &mdash; <span className="text-white font-sans font-bold">{scanNotification.itemName}</span>
                    </span>
                  ) : (
                    <span>
                      ⚠ <strong>BARCODE BARU TERDETEKSI:</strong> [{scanNotification.barcode}] (Siap Didaftarkan ke Master)
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScanNotification(null)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded bg-black/50 border border-neutral-700 shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: CEK STOK (STOCK OPNAME) */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              {/* Store Dedicated Stock Banner */}
              <div className="bg-[#0f1217] border border-[#232731] rounded p-2.5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-neutral-300">
                    Pencatatan Stok Khusus Toko: <strong className="text-white">{store.name}</strong>
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold">
                  TERPISAH TIAP TOKO
                </span>
              </div>

              {/* Add Stock Card */}
              <div className="bg-[#0a0b0d] border border-neutral-800 rounded p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-neutral-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-xs"></span>
                    Input Opname Fisik
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget('stock');
                      setIsScannerOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-xs font-mono font-bold uppercase rounded text-white shadow-sm transition"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>Scan Barcode Kamera</span>
                  </button>
                </div>

                <form onSubmit={handleAddStockEntry} className="space-y-3">
                  {/* Immediate Barcode Display & Direct Scanner Row */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-mono uppercase text-neutral-400">
                        Barcode Barang (Langsung Muncul Saat Scan)
                      </label>
                      {currentSelectedItem && (
                        <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/70 border border-red-800 px-1.5 py-0.5 rounded">
                          TERPILIH: {currentSelectedItem.barcode}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={stockBarcodeInput}
                          onChange={(e) => handleDirectBarcodeInput(e.target.value, 'stock')}
                          placeholder="Hasil scan barcode otomatis muncul di sini..."
                          className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-red-500 pr-8"
                        />
                        {stockBarcodeInput && (
                          <button
                            type="button"
                            onClick={() => setStockBarcodeInput('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
                            title="Hapus barcode"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTarget('stock');
                          setIsScannerOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-xs font-mono font-bold uppercase rounded text-white transition shrink-0"
                        title="Buka Kamera Barcode Scanner"
                      >
                        <Scan className="w-3.5 h-3.5" />
                        <span>Scan</span>
                      </button>
                    </div>
                  </div>

                  {/* Select Item */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                      Pilih Barang (atau Gunakan Barcode)
                    </label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => {
                        setSelectedItemId(e.target.value);
                        const it = items.find(i => i.id === e.target.value);
                        if (it) setStockBarcodeInput(it.barcode);
                      }}
                      className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-xs font-medium text-white focus:outline-hidden focus:border-red-500"
                    >
                      {items.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.barcode}) - 1 Dus={i.boxPerDus} Box={i.boxPerDus * i.pcsPerBox} Pcs
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Previous Week Benchmark Display */}
                  {currentSelectedItem && (
                    <div className="p-2.5 rounded bg-neutral-900/90 border border-neutral-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-neutral-400">
                          Data Mock Pembanding (Stok Minggu Lalu):
                        </div>
                        <div className="text-neutral-200 font-mono font-semibold">
                          {mockLastWeekPcs} Pcs <span className="text-neutral-400">({lastWeekBreakdown.display})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">Rasio Konversi:</span>
                        <div className="text-[11px] font-mono text-amber-400 font-bold">
                          1 Dus = {currentSelectedItem.boxPerDus} Box = {currentSelectedItem.boxPerDus * currentSelectedItem.pcsPerBox} Pcs
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Qty & Unit Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                        Pilihan Satuan Hitung
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-[#14171d] p-1 rounded border border-neutral-700">
                        {(['Dus', 'Box', 'Pcs'] as UnitType[]).map((u) => {
                          const isBoxZero = u === 'Box' && currentSelectedItem?.boxPerDus === 0;
                          return (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setStockInputUnit(u)}
                              className={`py-1.5 text-xs font-mono font-bold uppercase rounded transition ${
                                stockInputUnit === u
                                  ? 'bg-red-600 text-white'
                                  : 'text-neutral-400 hover:text-white'
                              } ${isBoxZero ? 'opacity-60' : ''}`}
                              title={isBoxZero ? 'Item ini memiliki nilai 0 Box (tanpa kemasan Box)' : undefined}
                            >
                              {u}{isBoxZero ? ' (0)' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                        Jumlah / Kuantitas ({stockInputUnit})
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={stockInputQty}
                        onChange={(e) => setStockInputQty(e.target.value)}
                        className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-sm font-mono text-white text-right focus:outline-hidden focus:border-red-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <button
                        type="submit"
                        className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Catat Stok</span>
                      </button>
                    </div>
                  </div>

                  {/* Real-time conversion preview calculation */}
                  {currentSelectedItem && (
                    <div className="text-[11px] font-mono text-neutral-300 bg-neutral-900/60 px-3 py-1.5 rounded border border-neutral-800/80 flex items-center justify-between">
                      <span>Hasil Konversi Real-Time:</span>
                      <strong className="text-red-400">
                        {currentQtyNum} {stockInputUnit} = {calculatedStockTotalPcs} Pcs
                      </strong>
                    </div>
                  )}
                </form>
              </div>

              {/* Recorded Opname List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400">
                  <span>Daftar Stok Fisik Tercatat ({stockEntries.length} Item)</span>
                  <span>Total Pcs vs Minggu Lalu</span>
                </div>

                {stockEntries.length === 0 ? (
                  <div className="p-8 text-center bg-[#0a0b0d] border border-dashed border-neutral-800 rounded text-neutral-500 text-xs font-mono">
                    Belum ada barang dihitung. Scan barcode atau pilih dari dropdown di atas.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stockEntries.map((entry) => {
                      const itemObj = items.find(i => i.id === entry.itemId);
                      const breakdown = itemObj 
                        ? convertPcsToBreakdown(entry.totalPcs, itemObj.boxPerDus, itemObj.pcsPerBox)
                        : { dus: 0, box: 0, pcs: entry.totalPcs, display: `${entry.totalPcs} Pcs` };
                      
                      const diffPcs = entry.totalPcs - entry.lastWeekPcs;

                      return (
                        <div 
                          key={entry.itemId}
                          className="p-3 rounded bg-[#0a0b0d] border border-neutral-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{entry.itemName}</div>
                            <div className="text-[10px] font-mono text-neutral-400">
                              Input: <strong className="text-white">{entry.inputQty} {entry.inputUnit}</strong> → Total: <strong className="text-white">{entry.totalPcs} Pcs</strong> ({breakdown.display})
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <div className="text-xs font-mono font-bold text-white">
                                {entry.totalPcs} Pcs
                              </div>
                              <div className="text-[10px] font-mono flex items-center justify-end gap-1">
                                <span className="text-neutral-500">Lalu: {entry.lastWeekPcs}</span>
                                {diffPcs >= 0 ? (
                                  <span className="text-emerald-400 flex items-center">
                                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> +{diffPcs}
                                  </span>
                                ) : (
                                  <span className="text-amber-400 flex items-center">
                                    <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> {diffPcs}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemoveStockEntry(entry.itemId)}
                              className="p-1.5 text-neutral-500 hover:text-red-400 rounded hover:bg-neutral-900"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PENCATATAN SELL-OUT */}
          {activeTab === 'sellout' && (
            <div className="space-y-4">
              {/* Add Sell-Out Card */}
              <div className="bg-[#0a0b0d] border border-neutral-800 rounded p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-neutral-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-amber-500 rounded-xs"></span>
                    Pencatatan Penjualan (Sell-Out)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget('sellout');
                      setIsScannerOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-xs font-mono font-bold uppercase rounded text-white shadow-sm transition"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>Scan Barcode Kamera</span>
                  </button>
                </div>

                <form onSubmit={handleAddSellOutRecord} className="space-y-3">
                  {/* Customer Name - Mandatory per PRD */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                      Nama Customer (Wajib Diisi) *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Ibu Siti / Toko Berkah Jaya / Pembeli Eceran"
                      className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-medium"
                      required
                    />
                  </div>

                  {/* Immediate Barcode Display & Direct Scanner Row for Sell-Out */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-mono uppercase text-neutral-400">
                        Barcode Barang Terjual (Langsung Muncul Saat Scan)
                      </label>
                      {currentSellOutItem && (
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-800 px-1.5 py-0.5 rounded">
                          TERPILIH: {currentSellOutItem.barcode}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={sellOutBarcodeInput}
                          onChange={(e) => handleDirectBarcodeInput(e.target.value, 'sellout')}
                          placeholder="Hasil scan barcode terjual otomatis muncul di sini..."
                          className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-amber-500 pr-8"
                        />
                        {sellOutBarcodeInput && (
                          <button
                            type="button"
                            onClick={() => setSellOutBarcodeInput('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
                            title="Hapus barcode"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTarget('sellout');
                          setIsScannerOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-xs font-mono font-bold uppercase rounded text-white transition shrink-0"
                        title="Buka Kamera Barcode Scanner"
                      >
                        <Scan className="w-3.5 h-3.5" />
                        <span>Scan</span>
                      </button>
                    </div>
                  </div>

                  {/* Select Item */}
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                      Pilih Barang Terjual
                    </label>
                    <select
                      value={sellOutItemId}
                      onChange={(e) => {
                        setSellOutItemId(e.target.value);
                        const it = items.find(i => i.id === e.target.value);
                        if (it) setSellOutBarcodeInput(it.barcode);
                      }}
                      className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-xs font-medium text-white focus:outline-hidden focus:border-amber-500"
                    >
                      {items.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.barcode}) - Pcs: {formatCurrencyIDR(i.pricePcs)} | Box: {formatCurrencyIDR(i.priceBox)} | Dus: {formatCurrencyIDR(i.priceDus)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Qty & Unit with Tier Pricing */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                        Satuan Penjualan
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-[#14171d] p-1 rounded border border-neutral-700">
                        {(['Dus', 'Box', 'Pcs'] as UnitType[]).map((u) => {
                          const isBoxZero = u === 'Box' && currentSellOutItem?.boxPerDus === 0;
                          return (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setSellOutUnit(u)}
                              className={`py-1.5 text-xs font-mono font-bold uppercase rounded transition ${
                                sellOutUnit === u
                                  ? 'bg-amber-500 text-black'
                                  : 'text-neutral-400 hover:text-white'
                              } ${isBoxZero ? 'opacity-60' : ''}`}
                              title={isBoxZero ? 'Item ini memiliki nilai 0 Box (tanpa kemasan Box)' : undefined}
                            >
                              {u}{isBoxZero ? ' (0)' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                        Qty Terjual ({sellOutUnit})
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={sellOutQty}
                        onChange={(e) => setSellOutQty(e.target.value)}
                        className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-sm font-mono text-white text-right focus:outline-hidden focus:border-amber-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <button
                        type="submit"
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Catat Sell-Out</span>
                      </button>
                    </div>
                  </div>

                  {/* Auto-calculated Total based on Tier Price */}
                  {currentSellOutItem && (
                    <div className="text-xs font-mono text-neutral-300 bg-neutral-900/60 p-3 rounded border border-neutral-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-400 block uppercase">Harga Tier Terpilih:</span>
                        <span className="font-bold text-white">{formatCurrencyIDR(sellOutUnitPrice)} / {sellOutUnit}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block uppercase">Subtotal Otomatis:</span>
                        <span className="font-bold text-amber-400 text-sm">{formatCurrencyIDR(sellOutLineSubtotal)}</span>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Recorded Sell-Out List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400">
                  <span>Transaksi Sell-Out ({sellOutRecords.length} Transaksi)</span>
                  <span className="text-amber-400 font-bold">Total: {formatCurrencyIDR(totalSellOutGrandTotal)}</span>
                </div>

                {sellOutRecords.length === 0 ? (
                  <div className="p-8 text-center bg-[#0a0b0d] border border-dashed border-neutral-800 rounded text-neutral-500 text-xs font-mono">
                    Belum ada catatan penjualan sell-out untuk toko ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sellOutRecords.map((record) => (
                      <div 
                        key={record.id}
                        className="p-3 rounded bg-[#0a0b0d] border border-neutral-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{record.customerName}</span>
                            <span className="text-[10px] font-mono text-neutral-500 font-normal">{record.timestamp}</span>
                          </div>
                          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                            {record.items.map((it, idx) => (
                              <span key={idx}>
                                {it.itemName} • {it.qty} {it.unit} @ {formatCurrencyIDR(it.pricePerUnit)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {formatCurrencyIDR(record.totalAmount)}
                          </span>
                          <button
                            onClick={() => handleRemoveSellOutRecord(record.id)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 rounded hover:bg-neutral-900"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHECK-OUT SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="bg-[#0a0b0d] border border-neutral-800 rounded p-4 space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Ringkasan Kunjungan Toko
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded bg-neutral-900/60 border border-neutral-800">
                    <span className="text-[10px] uppercase text-neutral-400 block">Stok Fisik Dihitung:</span>
                    <strong className="text-base text-white">{stockEntries.length} Jenis Produk</strong>
                  </div>
                  <div className="p-3 rounded bg-neutral-900/60 border border-neutral-800">
                    <span className="text-[10px] uppercase text-neutral-400 block">Total Penjualan Sell-Out:</span>
                    <strong className="text-base text-amber-400">{formatCurrencyIDR(totalSellOutGrandTotal)}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Catatan Khusus Kunjungan (Opsional)
                  </label>
                  <textarea
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Toko meminta re-order Indomie minggu depan, display rak rapi..."
                    className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="p-3 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Petugas Merchandiser:</span>
                    <strong className="text-white">{mdName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nama Toko:</span>
                    <strong className="text-white">{store.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu Check-In:</span>
                    <strong className="text-white">{new Date().toLocaleTimeString('id-ID')}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-neutral-800">
                    <span>Status Setelah Check-Out:</span>
                    <span>SELESAI (MEMBUKA TOKO BERIKUTNYA)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0d0e12] border-t border-neutral-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-bold uppercase rounded"
          >
            Tutup (Draf Tersimpan)
          </button>

          {activeTab !== 'summary' ? (
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className="px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition"
            >
              Lanjut ke Ringkasan →
            </button>
          ) : (
            <button
              type="button"
              id="btn-confirm-checkout"
              disabled={isSubmitting}
              onClick={handleCompleteCheckOut}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded transition flex items-center gap-2 shadow-lg"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses Check-Out...' : 'Selesaikan Kunjungan & Check-Out'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        availableItems={items}
      />

      {/* Quick Item Register Modal for Unregistered Barcodes */}
      <QuickItemRegisterModal
        isOpen={isRegisterOpen}
        initialBarcode={unregisteredBarcode}
        onClose={() => setIsRegisterOpen(false)}
        onRegistered={handleNewItemRegistered}
      />
    </div>
  );
};
