import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Calculator, PackagePlus, Scan } from 'lucide-react';
import { Item } from '../../types';
import { itemService } from '../../services/itemService';

interface QuickItemRegisterModalProps {
  isOpen: boolean;
  initialBarcode?: string;
  onClose: () => void;
  onRegistered: (newItem: Item) => void;
}

export const QuickItemRegisterModal: React.FC<QuickItemRegisterModalProps> = ({
  isOpen,
  initialBarcode = '',
  onClose,
  onRegistered
}) => {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General Food & Beverage');
  const [boxPerDus, setBoxPerDus] = useState<number>(4);
  const [pcsPerBox, setPcsPerBox] = useState<number>(12);
  const [priceDus, setPriceDus] = useState<number>(100000);
  const [priceBox, setPriceBox] = useState<number>(27000);
  const [pricePcs, setPricePcs] = useState<number>(2500);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync whenever initialBarcode or isOpen changes so scanned barcode immediately appears!
  useEffect(() => {
    if (initialBarcode) {
      setBarcode(initialBarcode);
    }
  }, [initialBarcode, isOpen]);

  if (!isOpen) return null;

  const totalPcsPerDus = boxPerDus === 0 ? pcsPerBox : boxPerDus * (pcsPerBox > 0 ? pcsPerBox : 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !name.trim()) {
      setErrorMsg('Barcode dan Nama Barang wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const newItem: Omit<Item, 'id'> = {
        barcode: barcode.trim(),
        name: name.trim(),
        category: category.trim(),
        boxPerDus: Math.max(0, Number(boxPerDus) || 0),
        pcsPerBox: Math.max(0, Number(pcsPerBox) || 0),
        priceDus: Number(priceDus) || 0,
        priceBox: Number(priceBox) || 0,
        pricePcs: Number(pricePcs) || 0,
        registeredBy: 'md',
        verificationStatus: 'pending_admin_verification'
      };

      const savedId = await itemService.saveItem(newItem);
      const completeItem: Item = { ...newItem, id: savedId };
      onRegistered(completeItem);
      onClose();
    } catch (err) {
      console.error('Failed to register new item:', err);
      setErrorMsg('Gagal menyimpan barang baru. Cek log error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-lg bg-[#14171d] border border-neutral-700 shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#0d0e12]">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono">Daftarkan Barang Baru di Tempat</h3>
              <p className="text-[10px] text-neutral-400">
                Otomatis masuk Master Barang. Perlu verifikasi admin untuk melengkapi detail &amp; harga resmi.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {/* Prominent Scanned Barcode Display */}
          <div className="p-3 bg-red-950/40 border border-red-600/80 rounded-lg flex items-center justify-between gap-3 text-xs font-mono">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-red-400 uppercase font-bold flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5" />
                <span>BARCODE DARI SCAN KAMERA:</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white tracking-widest truncate mt-0.5">
                {barcode || '(Belum terisi)'}
              </div>
            </div>
            <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase rounded shrink-0">
              Barang Baru
            </span>
          </div>

          {/* Barcode & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                Barcode (Scan/Ketik) *
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-[#0a0b0d] border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                Kategori Produk
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Snack, Minuman, Sembako..."
                className="w-full bg-[#0a0b0d] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
              Nama Barang / Produk *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Chiki Balls Keju 55g"
              className="w-full bg-[#0a0b0d] border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-hidden focus:border-red-500"
              required
            />
          </div>

          {/* Unit Conversion Section */}
          <div className="p-3.5 rounded bg-[#0a0b0d] border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
              <Calculator className="w-3.5 h-3.5" />
              <span>Konversi 3 Satuan (Dus → Box → Pcs)</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                  1 Dus = ... Box (Bisa 0 jika tanpa Box)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={boxPerDus}
                  onChange={(e) => setBoxPerDus(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white text-right"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                  {boxPerDus === 0 ? '1 Dus = ... Pcs (Langsung)' : '1 Box = ... Pcs'}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={pcsPerBox}
                  onChange={(e) => setPcsPerBox(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#14171d] border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white text-right"
                  required
                />
              </div>
            </div>

            <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/80 p-2 rounded border border-neutral-800 flex items-center justify-between">
              <span>Total Satuan Terkecil:</span>
              <span className="font-bold text-white font-mono">1 Dus = {totalPcsPerDus} Pcs</span>
            </div>
          </div>

          {/* 3 Price Tiers */}
          <div className="p-3.5 rounded bg-[#0a0b0d] border border-neutral-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
              Tier Harga Penjualan (IDR)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                  Harga / Dus
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={priceDus}
                  onChange={(e) => setPriceDus(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#14171d] border border-neutral-700 rounded px-2.5 py-1.5 text-xs font-mono text-white text-right"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                  Harga / Box
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={priceBox}
                  onChange={(e) => setPriceBox(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#14171d] border border-neutral-700 rounded px-2.5 py-1.5 text-xs font-mono text-white text-right"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                  Harga / Pcs
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={pricePcs}
                  onChange={(e) => setPricePcs(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#14171d] border border-neutral-700 rounded px-2.5 py-1.5 text-xs font-mono text-white text-right"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider rounded text-neutral-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-2.5 bg-amber-500 hover:bg-amber-400 text-xs font-bold uppercase tracking-wider rounded text-black font-mono transition flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Daftarkan Barang'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
