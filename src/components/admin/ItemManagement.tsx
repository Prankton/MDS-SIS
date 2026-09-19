import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Scan, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Calculator, 
  Package, 
  DollarSign,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Item } from '../../types';
import { itemService, formatCurrencyIDR } from '../../services/itemService';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';

interface ItemManagementProps {
  items: Item[];
  onItemsChanged: () => void;
}

export const ItemManagement: React.FC<ItemManagementProps> = ({
  items,
  onItemsChanged
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Form states
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General Food & Beverage');
  const [boxPerDus, setBoxPerDus] = useState<number>(4);
  const [pcsPerBox, setPcsPerBox] = useState<number>(10);
  const [priceDus, setPriceDus] = useState<number>(120000);
  const [priceBox, setPriceBox] = useState<number>(32000);
  const [pricePcs, setPricePcs] = useState<number>(3500);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pendingVerificationItems = items.filter(
    i => i.verificationStatus === 'pending_admin_verification'
  );
  const pendingCount = pendingVerificationItems.length;
  const verifiedCount = items.length - pendingCount;

  const openCreateModal = () => {
    setEditingItem(null);
    setBarcode('');
    setName('');
    setCategory('General');
    setBoxPerDus(4);
    setPcsPerBox(10);
    setPriceDus(100000);
    setPriceBox(27000);
    setPricePcs(3000);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setBarcode(item.barcode);
    setName(item.name);
    setCategory(item.category || 'General');
    setBoxPerDus(item.boxPerDus);
    setPcsPerBox(item.pcsPerBox);
    setPriceDus(item.priceDus);
    setPriceBox(item.priceBox);
    setPricePcs(item.pricePcs);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !name.trim()) {
      setErrorMessage('Barcode dan Nama Barang wajib diisi.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload: Omit<Item, 'id'> = {
        barcode: barcode.trim(),
        name: name.trim(),
        category: category.trim(),
        boxPerDus: Math.max(0, Number(boxPerDus) || 0), // Nilai Box bisa 0
        pcsPerBox: Math.max(0, Number(pcsPerBox) || 0),
        priceDus: Math.max(0, Number(priceDus) || 0),
        priceBox: Math.max(0, Number(priceBox) || 0),
        pricePcs: Math.max(0, Number(pricePcs) || 0),
        registeredBy: editingItem?.registeredBy || 'admin',
        verificationStatus: 'verified' // Verifikasi admin berlaku saat admin menyimpan
      };

      if (editingItem) {
        await itemService.verifyItem(editingItem.id, payload, 'SukaMulyaPtk@gmail.com');
      } else {
        await itemService.saveItem({ ...payload, verificationStatus: 'verified' });
      }

      setIsModalOpen(false);
      onItemsChanged();
    } catch (err) {
      console.error('Save item error:', err);
      setErrorMessage('Gagal menyimpan barang ke master catalog.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (window.confirm(`Hapus barang "${itemName}" dari master katalog?`)) {
      try {
        await itemService.deleteItem(id);
        onItemsChanged();
      } catch (err) {
        console.error('Delete item error:', err);
      }
    }
  };

  const handleScanForForm = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
  };

  const filteredItems = items.filter(item => {
    // Verification filter
    if (verificationFilter === 'pending' && item.verificationStatus !== 'pending_admin_verification') {
      return false;
    }
    if (verificationFilter === 'verified' && item.verificationStatus === 'pending_admin_verification') {
      return false;
    }

    // Search query
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q));
  });

  // Calculate preview with boxPerDus = 0 support
  const totalPcsPreview = boxPerDus === 0 
    ? pcsPerBox 
    : boxPerDus * (pcsPerBox > 0 ? pcsPerBox : 1);

  return (
    <div className="space-y-4">
      {/* 1. Admin Verification Alert Banner if there are pending items from MD */}
      {pendingCount > 0 && (
        <div className="bg-amber-950/70 border-2 border-amber-500 rounded-lg p-4 text-white shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-amber-500 text-black shrink-0 mt-0.5 font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-amber-300">
                  PERLU VERIFIKASI DETAIL BARANG ({pendingCount} ITEM)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-400 text-black font-bold rounded">
                  DIDAFTARKAN MD
                </span>
              </div>
              <p className="text-xs text-neutral-200 mt-1">
                Petugas MD telah mendaftarkan barang baru di lokasi toko. Admin perlu memeriksa kelengkapan detail barang, rasio konversi (nilai Box bisa 0), dan tier harga resmi.
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerificationFilter('pending')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold uppercase tracking-wider rounded transition shrink-0"
          >
            Filter Barang Perlu Verifikasi
          </button>
        </div>
      )}

      {/* 2. Top Controls & Verification Status Tabs */}
      <div className="bg-[#121418] border border-[#1f2228] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari barcode atau nama barang..."
            className="w-full bg-[#0a0b0d] border border-[#262930] rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono"
          />
        </div>

        {/* Verification Filter Tabs */}
        <div className="flex items-center bg-[#0a0b0d] p-0.5 rounded border border-[#262930] font-mono text-xs">
          <button
            onClick={() => setVerificationFilter('all')}
            className={`px-3 py-1.5 rounded transition ${
              verificationFilter === 'all'
                ? 'bg-[#262930] text-white font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Semua ({items.length})
          </button>
          <button
            onClick={() => setVerificationFilter('pending')}
            className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
              verificationFilter === 'pending'
                ? 'bg-amber-500 text-black font-bold'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <span>Perlu Verifikasi</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                verificationFilter === 'pending' ? 'bg-black text-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-700'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setVerificationFilter('verified')}
            className={`px-3 py-1.5 rounded transition ${
              verificationFilter === 'verified'
                ? 'bg-[#262930] text-emerald-400 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Terverifikasi ({verifiedCount})
          </button>
        </div>

        <button
          id="btn-add-item"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold uppercase tracking-wider rounded transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Barang Baru</span>
        </button>
      </div>

      {/* 3. Item Table */}
      <div className="bg-[#121418] border border-[#1f2228] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0a0b0d] text-neutral-400 uppercase tracking-wider border-b border-[#1f2228]">
              <tr>
                <th className="py-3 px-4">Status &amp; Barcode</th>
                <th className="py-3 px-4">Nama Barang</th>
                <th className="py-3 px-4">Rasio Konversi (Nilai Box bisa 0)</th>
                <th className="py-3 px-4 text-right">Harga / Dus</th>
                <th className="py-3 px-4 text-right">Harga / Box</th>
                <th className="py-3 px-4 text-right">Harga / Pcs</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2228] text-neutral-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    Tidak ada barang yang cocok dengan pencarian / filter verifikasi.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isPending = item.verificationStatus === 'pending_admin_verification';
                  const totalPcsInDus = item.boxPerDus === 0 
                    ? item.pcsPerBox 
                    : item.boxPerDus * (item.pcsPerBox > 0 ? item.pcsPerBox : 1);

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition ${
                        isPending ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-[#161920]'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-amber-400 font-bold">{item.barcode}</span>
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[9px] font-bold uppercase tracking-wider w-max">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              PERLU VERIFIKASI DETAIL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] text-neutral-500 uppercase tracking-wider">
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                              VERIFIED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.registeredBy === 'md' && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 font-normal">
                              Dari MD
                            </span>
                          )}
                        </div>
                        {item.category && (
                          <div className="text-[10px] font-mono text-neutral-500 font-normal">{item.category}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200">
                          {item.boxPerDus === 0 ? (
                            <span>1 Dus = <strong className="text-amber-300">0 Box (Tanpa Box)</strong> = <strong className="text-white">{item.pcsPerBox} Pcs</strong></span>
                          ) : (
                            <span>1 Dus = <strong className="text-white">{item.boxPerDus} Box</strong> = <strong className="text-amber-400">{totalPcsInDus} Pcs</strong></span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white font-bold">
                        {formatCurrencyIDR(item.priceDus)}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-300">
                        {item.boxPerDus === 0 ? (
                          <span className="text-neutral-500 italic">- (0 Box)</span>
                        ) : (
                          formatCurrencyIDR(item.priceBox)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-400">
                        {formatCurrencyIDR(item.pricePcs)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {isPending ? (
                          <button
                            onClick={() => openEditModal(item)}
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase transition inline-flex items-center gap-1 shadow-sm"
                            title="Verifikasi dan lengkapi detail barang"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Verifikasi Detail</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                            title="Edit Barang"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition"
                          title="Hapus Barang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD / Verifikasi Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg bg-[#14171d] border border-neutral-700 shadow-2xl text-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#0d0e12]">
              <div className="flex items-center gap-2">
                {editingItem?.verificationStatus === 'pending_admin_verification' ? (
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                ) : (
                  <Package className="w-4 h-4 text-neutral-400" />
                )}
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                  {editingItem?.verificationStatus === 'pending_admin_verification'
                    ? 'Verifikasi & Lengkapi Detail Barang MD'
                    : editingItem
                    ? 'Edit Master Barang'
                    : 'Tambah Master Barang Baru'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Special notice if verifying MD input */}
              {editingItem?.verificationStatus === 'pending_admin_verification' && (
                <div className="p-3 rounded bg-amber-950/60 border border-amber-700 text-amber-200 text-xs font-mono space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    Barang Didaftarkan oleh Petugas MD di Lapangan
                  </div>
                  <p className="text-[11px] text-neutral-300">
                    Silakan periksa atau sesuaikan nama barang, rasio konversi (nilai Box bisa 0 jika tidak ada kemasan Box), serta harga tier resmi. Mengklik tombol simpan di bawah akan menyetujui dan memverifikasi barang ini secara resmi.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Barcode with Scan Trigger */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Barcode Produk *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Contoh: 8991002101112"
                    className="flex-1 bg-[#0a0b0d] border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-200 text-xs font-mono flex items-center gap-1.5"
                    title="Scan Barcode Kamera"
                  >
                    <Scan className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Indomie Goreng Special 85g"
                  className="w-full bg-[#0a0b0d] border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Instant Noodle, Beverage, Snack..."
                  className="w-full bg-[#0a0b0d] border border-neutral-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              {/* 3 Unit Conversion with 1 Box bisa 0 */}
              <div className="p-3.5 rounded bg-[#0a0b0d] border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Definisi Rasio Konversi 3 Satuan</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">
                      1 Dus = Berapa Box? (Bisa 0 jika tanpa Box)
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
                      {boxPerDus === 0 ? '1 Dus = Berapa Pcs? (Langsung)' : '1 Box = Berapa Pcs?'}
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
                  <span>Hasil Konversi Satuan Terkecil:</span>
                  <span className="font-bold text-white font-mono">
                    {boxPerDus === 0
                      ? `1 Dus = Tanpa Box (0 Box) = ${totalPcsPreview} Pcs`
                      : `1 Dus = ${boxPerDus} Box = ${totalPcsPreview} Pcs`}
                  </span>
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
                      Harga / Dus (IDR)
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
                      Harga / Box {boxPerDus === 0 ? '(0 / N/A)' : '(IDR)'}
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
                      Harga / Pcs (IDR)
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
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-mono font-bold uppercase rounded text-neutral-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-2/3 py-2.5 bg-amber-500 hover:bg-amber-400 text-xs font-mono font-bold uppercase tracking-wider rounded text-black transition flex items-center justify-center gap-1.5 font-bold"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isSaving 
                      ? 'Menyimpan...' 
                      : editingItem?.verificationStatus === 'pending_admin_verification'
                      ? 'Verifikasi & Simpan Detail'
                      : 'Simpan Master Barang'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for form */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanForForm}
        availableItems={items}
      />
    </div>
  );
};
