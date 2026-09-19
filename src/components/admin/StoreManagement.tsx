import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  X, 
  Calendar, 
  Check, 
  AlertCircle,
  Building2,
  CalendarCheck2
} from 'lucide-react';
import { Store, DayOfWeek } from '../../types';
import { storeService, DAYS_OF_WEEK } from '../../services/storeService';

interface StoreManagementProps {
  stores: Store[];
  onStoresChanged: () => void;
}

const TWO_DAYS_PRESETS: { label: string; days: DayOfWeek[] }[] = [
  { label: 'Senin & Kamis', days: ['Senin', 'Kamis'] },
  { label: 'Selasa & Jumat', days: ['Selasa', 'Jumat'] },
  { label: 'Rabu & Sabtu', days: ['Rabu', 'Sabtu'] },
  { label: 'Senin & Jumat', days: ['Senin', 'Jumat'] }
];

export const StoreManagement: React.FC<StoreManagementProps> = ({
  stores,
  onStoresChanged
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<DayOfWeek | 'Semua'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formMapsUrl, setFormMapsUrl] = useState('');
  const [formVisitDays, setFormVisitDays] = useState<DayOfWeek[]>(['Senin', 'Kamis']);
  const [formVisitOrder, setFormVisitOrder] = useState<number>(1);
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingStore(null);
    setFormName('');
    setFormLocation('');
    setFormMapsUrl('');
    setFormVisitDays(['Senin', 'Kamis']);
    setFormVisitOrder(1);
    setFormContactPerson('');
    setFormPhone('');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setFormName(store.name);
    setFormLocation(store.location || '');
    setFormMapsUrl(store.mapsUrl || '');
    const initialDays: DayOfWeek[] = (store.visitDays && store.visitDays.length > 0)
      ? store.visitDays
      : (store.visitDay ? [store.visitDay] : (['Senin', 'Kamis'] as DayOfWeek[]));
    setFormVisitDays(initialDays);
    setFormVisitOrder(store.visitOrder || 1);
    setFormContactPerson(store.contactPerson || '');
    setFormPhone(store.phone || '');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const toggleFormDay = (day: DayOfWeek) => {
    setFormVisitDays(prev => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev; // Keep at least one day
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('Nama Toko wajib diisi.');
      return;
    }

    if (formVisitDays.length === 0) {
      setErrorMessage('Pilih minimal 1 hari kunjungan untuk toko ini.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload: Omit<Store, 'id'> = {
        name: formName.trim(),
        location: formLocation.trim(), // Opsional (tidak wajib)
        mapsUrl: formMapsUrl.trim(),
        visitDays: formVisitDays,
        visitDay: formVisitDays[0] || 'Senin',
        visitOrder: Math.min(6, Math.max(1, Number(formVisitOrder) || 1)),
        contactPerson: formContactPerson.trim(),
        phone: formPhone.trim()
      };

      if (editingStore) {
        await storeService.updateStore(editingStore.id, payload);
      } else {
        await storeService.saveStore(payload);
      }

      setIsModalOpen(false);
      onStoresChanged();
    } catch (err) {
      console.error('Save store error:', err);
      setErrorMessage('Gagal menyimpan data toko ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Hapus toko "${name}" dari database?`)) {
      try {
        await storeService.deleteStore(id);
        onStoresChanged();
      } catch (err) {
        console.error('Delete store error:', err);
      }
    }
  };

  // Filter stores
  const filteredStores = stores.filter(s => {
    const hasDay = s.visitDays && s.visitDays.length > 0
      ? s.visitDays.includes(selectedDayFilter as DayOfWeek)
      : s.visitDay === selectedDayFilter;
    const matchDay = selectedDayFilter === 'Semua' || hasDay;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchDay && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Action Bar (Search, Day Filters, Add Store) */}
      <div className="bg-[#121418] border border-[#1f2228] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0 max-w-full sm:max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari toko atau lokasi..."
            className="w-full bg-[#0a0b0d] border border-[#262930] rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-red-500 font-mono min-h-[44px]"
          />
        </div>

        {/* Add Store Button */}
        <button
          id="btn-add-store"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs sm:text-sm font-mono font-bold uppercase tracking-wider rounded-lg transition shadow-sm min-h-[44px] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Toko Baru</span>
        </button>
      </div>

      {/* Day Filter Chips (Scrollable horizontally on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
        <button
          onClick={() => setSelectedDayFilter('Semua')}
          className={`px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase transition shrink-0 min-h-[40px] flex items-center gap-1 ${
            selectedDayFilter === 'Semua'
              ? 'bg-[#262930] text-white border border-neutral-600'
              : 'bg-[#121418] text-neutral-400 hover:text-white border border-[#1f2228]'
          }`}
        >
          <span>Semua Toko</span>
          <span className="text-[10px] opacity-75">({stores.length})</span>
        </button>
        {DAYS_OF_WEEK.map(d => {
          const count = stores.filter(s => 
            s.visitDays && s.visitDays.length > 0 ? s.visitDays.includes(d) : s.visitDay === d
          ).length;
          const isSelected = selectedDayFilter === d;
          return (
            <button
              key={d}
              onClick={() => setSelectedDayFilter(d)}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase transition shrink-0 min-h-[40px] flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-[#121418] text-neutral-400 hover:text-white border border-[#1f2228]'
              }`}
            >
              <span>{d}</span>
              <span className="text-[10px] opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Card View (shown on screens < lg) */}
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {filteredStores.length === 0 ? (
          <div className="p-8 text-center bg-[#121418] border border-[#1f2228] rounded-xl text-neutral-400 text-xs font-mono">
            Tidak ada toko yang cocok dengan pencarian atau filter hari.
          </div>
        ) : (
          filteredStores.map(store => {
            const daysList = store.visitDays && store.visitDays.length > 0 
              ? store.visitDays 
              : [store.visitDay || 'Senin'];
            return (
              <div 
                key={store.id} 
                className="bg-[#121418] border border-[#1f2228] rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-md bg-neutral-800 text-white text-xs font-mono font-black flex items-center justify-center border border-neutral-700 shrink-0 mt-0.5">
                      #{store.visitOrder}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white font-sans">{store.name}</h4>
                      {/* Visit Days Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {daysList.map(d => (
                          <span key={d} className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700 text-[10px] font-mono font-bold">
                            {d}
                          </span>
                        ))}
                        {daysList.length >= 2 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[9px] font-mono font-bold uppercase">
                            2x / Minggu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(store)}
                      className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Edit Toko"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(store.id, store.name)}
                      className="p-2 rounded-lg bg-neutral-800/80 hover:bg-red-950 hover:text-red-400 text-neutral-400 min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Hapus Toko"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  {store.location ? (
                    <span className="truncate">{store.location}</span>
                  ) : (
                    <span className="text-neutral-500 italic">Alamat belum ditentukan (opsional)</span>
                  )}
                  {store.mapsUrl && (
                    <a 
                      href={store.mapsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 ml-1 inline-flex items-center gap-0.5 text-[11px] font-mono shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Maps
                    </a>
                  )}
                </div>

                {/* PIC and Physical Stock info */}
                <div className="flex items-center justify-between pt-1 text-[11px] font-mono border-t border-neutral-800/60 text-neutral-400">
                  <span>PIC: {store.contactPerson || '-'} {store.phone ? `(${store.phone})` : ''}</span>
                  {store.currentStock && store.currentStock.length > 0 ? (
                    <span className="text-blue-400 font-bold">{store.currentStock.length} Item Stok</span>
                  ) : (
                    <span className="text-neutral-600">Belum ada stok</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (shown on lg screens and up) */}
      <div className="hidden lg:block bg-[#121418] border border-[#1f2228] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0a0b0d] text-neutral-400 uppercase tracking-wider border-b border-[#1f2228]">
              <tr>
                <th className="py-3 px-4 w-16">Prioritas</th>
                <th className="py-3 px-4">Nama Toko</th>
                <th className="py-3 px-4">Alamat / Jalan</th>
                <th className="py-3 px-4">Jadwal Kunjungan</th>
                <th className="py-3 px-4">Stok Fisik Toko</th>
                <th className="py-3 px-4">Kontak PIC</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2228] text-neutral-300">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    Tidak ada toko yang cocok dengan pencarian atau filter hari.
                  </td>
                </tr>
              ) : (
                filteredStores.map(store => {
                  const daysList = store.visitDays && store.visitDays.length > 0 
                    ? store.visitDays 
                    : [store.visitDay || 'Senin'];
                  return (
                    <tr key={store.id} className="hover:bg-[#161920] transition">
                      <td className="py-3 px-4">
                        <span className="w-6 h-6 rounded bg-neutral-800 text-white font-bold flex items-center justify-center border border-neutral-700">
                          {store.visitOrder}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span>{store.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-400 font-sans">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          {store.location ? (
                            <span>{store.location}</span>
                          ) : (
                            <span className="text-neutral-500 italic">Alamat belum diatur (opsional)</span>
                          )}
                          {store.mapsUrl && (
                            <a 
                              href={store.mapsUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-red-400 hover:text-red-300 ml-1"
                              title="Buka Google Maps"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {daysList.map(d => (
                            <span key={d} className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 text-[11px] font-mono">
                              {d}
                            </span>
                          ))}
                          {daysList.length >= 2 && (
                            <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[9px] font-bold">
                              2x/MGG
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {store.currentStock && store.currentStock.length > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono">
                            {store.currentStock.length} Item Tercatat
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[10px] font-mono">
                            Belum Ada
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        {store.contactPerson || '-'} {store.phone ? `(${store.phone})` : ''}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(store)}
                          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                          title="Edit Toko"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(store.id, store.name)}
                          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition"
                          title="Hapus Toko"
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

      {/* Modal Form: Tambah / Edit Toko */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-[#14171d] border border-neutral-700 shadow-2xl text-white overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-neutral-800 bg-[#0d0e12]">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-4 h-4 text-red-500" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono">
                  {editingStore ? 'Edit Jadwal & Toko' : 'Tambah Toko Baru'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-neutral-400 hover:text-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Store Name (Required) */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Nama Toko <span className="text-red-500">* (Wajib)</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Toko Berkah Jaya"
                  className="w-full bg-[#0a0b0d] border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-red-500 min-h-[44px]"
                  required
                />
              </div>

              {/* Location (Optional - Jln tidak wajib) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono uppercase text-neutral-400">
                    Alamat / Jalan Toko
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Opsional (Tidak Wajib)
                  </span>
                </div>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Contoh: Jl. Gajah Mada No. 10 (boleh dikosongkan)"
                  className="w-full bg-[#0a0b0d] border border-neutral-700 rounded-lg px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:border-red-500 min-h-[44px]"
                />
              </div>

              {/* Google Maps URL */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  URL Google Maps (Opsional)
                </label>
                <input
                  type="url"
                  value={formMapsUrl}
                  onChange={(e) => setFormMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full bg-[#0a0b0d] border border-neutral-700 rounded-lg px-3 py-2.5 text-xs font-mono text-white focus:outline-hidden focus:border-red-500 min-h-[44px]"
                />
              </div>

              {/* Visit Days: 2x Kunjungan Seminggu */}
              <div className="space-y-2 bg-[#0a0b0d] p-3.5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-white font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-red-500" />
                    <span>Jadwal Kunjungan (2x Dalam Seminggu)</span>
                  </label>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                    {formVisitDays.length} Hari Terpilih
                  </span>
                </div>

                {/* 2x A Week Quick Presets */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Preset Cepat 2x Seminggu:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TWO_DAYS_PRESETS.map((preset) => {
                      const isMatch = preset.days.length === formVisitDays.length &&
                        preset.days.every(d => formVisitDays.includes(d));
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormVisitDays(preset.days)}
                          className={`px-2.5 py-1.5 rounded-md text-[11px] font-mono font-semibold transition border text-center ${
                            isMatch
                              ? 'bg-red-600 text-white border-red-500 shadow-xs'
                              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Day Toggles */}
                <div className="pt-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1.5">
                    Atau Pilih Hari Kustom (Ketuk untuk aktifkan/nonaktifkan):
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = formVisitDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleFormDay(day)}
                          className={`py-2 px-1 text-xs font-mono font-bold uppercase rounded-lg border transition flex items-center justify-center gap-1 min-h-[40px] ${
                            isSelected
                              ? 'bg-red-600/90 text-white border-red-500 shadow-xs'
                              : 'bg-[#121418] text-neutral-400 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{day}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Priority / Visit Order */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Visit Order / Prioritas Urutan Rute (1 - 6) *
                </label>
                <select
                  value={formVisitOrder}
                  onChange={(e) => setFormVisitOrder(Number(e.target.value))}
                  className="w-full bg-[#0a0b0d] border border-neutral-700 rounded-lg px-3 py-2.5 text-xs font-mono text-white focus:outline-hidden focus:border-red-500 min-h-[44px]"
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>
                      Prioritas #{num} {num === 1 ? '(Toko Pertama / Wajib Awal)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* PIC and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Nama PIC Toko (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="Nama pemilik / kasir"
                    className="w-full bg-[#0a0b0d] border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full bg-[#0a0b0d] border border-neutral-700 rounded-lg px-3 py-2.5 text-xs font-mono text-white min-h-[44px]"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-xs font-mono font-bold uppercase rounded-lg text-neutral-300 min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-2/3 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-xs font-mono font-bold uppercase tracking-wider rounded-lg text-white transition flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Toko'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
