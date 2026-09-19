import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestoreData } from '../firebase/config';
import { Store, DayOfWeek, StockOpnameEntry } from '../types';

const COLLECTION_PATH = 'stores';

export const INITIAL_STORES: Store[] = [
  {
    id: 'store-001',
    name: 'Toko Sumber Rejeki',
    location: 'Jl. Gajah Mada No. 42, Pontianak Barat',
    mapsUrl: 'https://maps.google.com/?q=-0.0245,109.3361',
    visitDays: ['Senin', 'Kamis'],
    visitDay: 'Senin',
    visitOrder: 1,
    contactPerson: 'Ko Kevin',
    phone: '0812-5555-1111',
    createdAt: new Date().toISOString()
  },
  {
    id: 'store-002',
    name: 'Minimarket Barokah Mart',
    location: 'Jl. Ahmad Yani II No. 18, Pontianak Tenggara',
    mapsUrl: 'https://maps.google.com/?q=-0.0521,109.3489',
    visitDays: ['Senin', 'Kamis'],
    visitDay: 'Senin',
    visitOrder: 2,
    contactPerson: 'Ibu Fatimah',
    phone: '0813-2222-3333',
    createdAt: new Date().toISOString()
  },
  {
    id: 'store-003',
    name: 'Toko Kelontong Sentosa',
    location: 'Jl. Tanjungpura No. 88, Pontianak Kota',
    mapsUrl: 'https://maps.google.com/?q=-0.0305,109.3377',
    visitDays: ['Senin', 'Kamis'],
    visitDay: 'Senin',
    visitOrder: 3,
    contactPerson: 'Pak Hendra',
    phone: '0852-7777-9999',
    createdAt: new Date().toISOString()
  },
  {
    id: 'store-004',
    name: 'Warung Madura 24 Jam Jaya',
    location: 'Jl. Veteran No. 12, Pontianak Selatan',
    mapsUrl: 'https://maps.google.com/?q=-0.0392,109.3412',
    visitDays: ['Senin', 'Jumat'],
    visitDay: 'Senin',
    visitOrder: 4,
    contactPerson: 'Cak Mahmud',
    phone: '0878-1111-2222',
    createdAt: new Date().toISOString()
  },
  {
    id: 'store-005',
    name: 'Toko Surya Abadi',
    location: 'Jl. Sungai Raya Dalam No. 5, Kubu Raya',
    mapsUrl: 'https://maps.google.com/?q=-0.0654,109.3621',
    visitDays: ['Selasa', 'Jumat'],
    visitDay: 'Selasa',
    visitOrder: 1,
    contactPerson: 'Ibu Lina',
    phone: '0819-4444-5555',
    createdAt: new Date().toISOString()
  },
  {
    id: 'store-006',
    name: 'Pusat Sembako Makmur',
    location: 'Jl. Danau Sentarum No. 33, Pontianak Kota',
    mapsUrl: 'https://maps.google.com/?q=-0.0410,109.3190',
    visitDays: ['Selasa', 'Sabtu'],
    visitDay: 'Selasa',
    visitOrder: 2,
    contactPerson: 'Ko Budi',
    phone: '0812-9988-7766',
    createdAt: new Date().toISOString()
  }
];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu'
];

export function getTodayIndonesianDay(): DayOfWeek {
  const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday
  switch (dayIndex) {
    case 1: return 'Senin';
    case 2: return 'Selasa';
    case 3: return 'Rabu';
    case 4: return 'Kamis';
    case 5: return 'Jumat';
    case 6: return 'Sabtu';
    case 0: return 'Minggu';
    default: return 'Senin';
  }
}

export const storeService = {
  subscribeStores(callback: (stores: Store[]) => void, onError?: (err: Error) => void) {
    const colRef = collection(db, COLLECTION_PATH);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const stores = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Store[];
        // Sort by visitOrder asc
        stores.sort((a, b) => a.visitOrder - b.visitOrder);
        callback(stores);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTION_PATH);
        } catch (e) {
          if (onError) onError(e as Error);
        }
      }
    );
  },

  async seedInitialStoresIfNeeded(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, COLLECTION_PATH));
      if (snap.empty) {
        for (const store of INITIAL_STORES) {
          await setDoc(doc(db, COLLECTION_PATH, store.id), store);
        }
      }
    } catch (e) {
      console.warn('Could not seed initial stores or already seeded in cache:', e);
    }
  },

  async saveStore(store: Omit<Store, 'id'> & { id?: string }): Promise<string> {
    const id = store.id || `store-${Date.now()}`;
    const visitDays: DayOfWeek[] = store.visitDays && store.visitDays.length > 0
      ? store.visitDays
      : (store.visitDay ? [store.visitDay] : (['Senin'] as DayOfWeek[]));
    const primaryVisitDay: DayOfWeek = visitDays[0] || 'Senin';

    const rawPayload: Store = {
      ...store,
      id,
      name: store.name || '',
      location: store.location || '',
      mapsUrl: store.mapsUrl || '',
      visitDays,
      visitDay: store.visitDay || primaryVisitDay,
      visitOrder: Number(store.visitOrder) || 1,
      contactPerson: store.contactPerson || '',
      phone: store.phone || '',
      updatedAt: new Date().toISOString(),
      createdAt: store.createdAt || new Date().toISOString()
    };
    const payload = sanitizeFirestoreData(rawPayload);
    try {
      await setDoc(doc(db, COLLECTION_PATH, id), payload);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_PATH}/${id}`);
    }
  },

  async updateStore(id: string, updates: Partial<Store>): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      if (updates.visitOrder !== undefined) {
        updateData.visitOrder = Number(updates.visitOrder);
      }
      if (updates.visitDays && updates.visitDays.length > 0 && !updates.visitDay) {
        updateData.visitDay = updates.visitDays[0];
      }
      const sanitizedUpdates = sanitizeFirestoreData(updateData);
      await updateDoc(doc(db, COLLECTION_PATH, id), sanitizedUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}/${id}`);
    }
  },

  async deleteStore(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_PATH}/${id}`);
    }
  },

  async updateStoreStock(storeId: string, stockEntries: StockOpnameEntry[], mdName?: string): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTION_PATH, storeId), {
        currentStock: stockEntries,
        lastStockUpdated: new Date().toISOString(),
        lastStockUpdatedBy: mdName || 'Merchandiser',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}/${storeId}`);
    }
  }
};
