import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestoreData } from '../firebase/config';
import { Item, UnitType } from '../types';

const COLLECTION_PATH = 'items';

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'item-001',
    barcode: '8991002101112',
    name: 'Indomie Goreng Special 85g',
    category: 'Instant Noodle',
    boxPerDus: 4, // 1 Dus = 4 Box
    pcsPerBox: 10, // 1 Box = 10 Pcs (1 Dus = 40 Pcs)
    priceDus: 124000,
    priceBox: 32000,
    pricePcs: 3500,
    registeredBy: 'admin',
    verificationStatus: 'verified',
    createdAt: new Date().toISOString()
  },
  {
    id: 'item-002',
    barcode: '8992753110204',
    name: 'Aqua Air Mineral 600ml',
    category: 'Beverage',
    boxPerDus: 0, // Nilai Box bisa 0: 1 Dus langsung isi 24 Pcs tanpa kemasan Box
    pcsPerBox: 24, // 1 Dus = 24 Pcs
    priceDus: 68000,
    priceBox: 0,
    pricePcs: 3500,
    registeredBy: 'admin',
    verificationStatus: 'verified',
    createdAt: new Date().toISOString()
  },
  {
    id: 'item-003',
    barcode: '8998866200155',
    name: 'Teh Botol Sosro Kotak 250ml',
    category: 'Beverage',
    boxPerDus: 4,
    pcsPerBox: 6, // 1 Dus = 24 Pcs
    priceDus: 78000,
    priceBox: 20000,
    pricePcs: 3800,
    registeredBy: 'admin',
    verificationStatus: 'verified',
    createdAt: new Date().toISOString()
  },
  {
    id: 'item-004',
    barcode: '8992696404415',
    name: 'Ultra Milk Cokelat 250ml',
    category: 'Dairy',
    boxPerDus: 4,
    pcsPerBox: 6, // 1 Dus = 24 Pcs
    priceDus: 142000,
    priceBox: 37000,
    pricePcs: 6500,
    registeredBy: 'admin',
    verificationStatus: 'verified',
    createdAt: new Date().toISOString()
  },
  {
    id: 'item-005',
    barcode: '8992745100010',
    name: 'Kapal Api Spesial Mix 24g',
    category: 'Coffee',
    boxPerDus: 10, // 1 Dus = 10 Renceng/Box
    pcsPerBox: 10, // 1 Box = 10 Sachet/Pcs (1 Dus = 100 Pcs)
    priceDus: 125000,
    priceBox: 13500,
    pricePcs: 1500,
    registeredBy: 'admin',
    verificationStatus: 'verified',
    createdAt: new Date().toISOString()
  }
];

// Helper to convert any quantity & unit to Total Pieces (Pcs)
// Nilai 1 Box bisa 0 (produk tanpa tingkat kemasan Box, langsung Dus -> Pcs)
export function convertToTotalPcs(qty: number, unit: UnitType, boxPerDus: number, pcsPerBox: number): number {
  const safeQty = Math.max(0, qty);
  const bpd = Math.max(0, boxPerDus);
  const ppb = Math.max(0, pcsPerBox);

  if (unit === 'Dus') {
    if (bpd === 0) {
      // Tanpa kemasan Box: 1 Dus langsung berisi ppb pcs
      return safeQty * ppb;
    }
    return safeQty * bpd * (ppb > 0 ? ppb : 1);
  }
  if (unit === 'Box') {
    if (bpd === 0) {
      return 0; // Box tidak ada untuk item ini
    }
    return safeQty * ppb;
  }
  return safeQty; // Pcs
}

// Helper to convert total pieces back to 3-tier breakdown: Dus, Box, and Pcs
export function convertPcsToBreakdown(
  totalPcs: number, 
  boxPerDus: number, 
  pcsPerBox: number
): { dus: number; box: number; pcs: number; display: string } {
  const bpd = Math.max(0, boxPerDus);
  const ppb = Math.max(0, pcsPerBox);

  if (bpd === 0) {
    // Tanpa kemasan Box (Box = 0): Konversi langsung Dus dan Pcs
    const pcsPerDus = ppb > 0 ? ppb : 1;
    const dus = Math.floor(totalPcs / pcsPerDus);
    const pcs = totalPcs % pcsPerDus;

    const parts: string[] = [];
    if (dus > 0) parts.push(`${dus} Dus`);
    if (pcs > 0 || parts.length === 0) parts.push(`${pcs} Pcs`);

    return {
      dus,
      box: 0,
      pcs,
      display: parts.join(' + ')
    };
  }

  const pcsPerDus = bpd * (ppb > 0 ? ppb : 1);
  const dus = pcsPerDus > 0 ? Math.floor(totalPcs / pcsPerDus) : 0;
  const remainderAfterDus = pcsPerDus > 0 ? totalPcs % pcsPerDus : totalPcs;
  const box = ppb > 0 ? Math.floor(remainderAfterDus / ppb) : 0;
  const pcs = ppb > 0 ? remainderAfterDus % ppb : remainderAfterDus;

  const parts: string[] = [];
  if (dus > 0) parts.push(`${dus} Dus`);
  if (box > 0) parts.push(`${box} Box`);
  if (pcs > 0 || parts.length === 0) parts.push(`${pcs} Pcs`);

  return {
    dus,
    box,
    pcs,
    display: parts.join(' + ')
  };
}

// Get price for specific unit
export function getPriceForUnit(item: Item, unit: UnitType): number {
  switch (unit) {
    case 'Dus':
      return item.priceDus;
    case 'Box':
      return item.priceBox;
    case 'Pcs':
      return item.pricePcs;
    default:
      return item.pricePcs;
  }
}

// Format IDR currency
export function formatCurrencyIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

export const itemService = {
  subscribeItems(callback: (items: Item[]) => void, onError?: (err: Error) => void) {
    const colRef = collection(db, COLLECTION_PATH);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Item[];
        callback(items);
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

  async getItems(): Promise<Item[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTION_PATH));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COLLECTION_PATH);
    }
  },

  async seedInitialItemsIfNeeded(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, COLLECTION_PATH));
      if (snap.empty) {
        for (const item of INITIAL_ITEMS) {
          await setDoc(doc(db, COLLECTION_PATH, item.id), item);
        }
      }
    } catch (e) {
      console.warn('Could not seed initial items or already seeded in cache:', e);
    }
  },

  async saveItem(item: Omit<Item, 'id'> & { id?: string }): Promise<string> {
    const id = item.id || `item-${Date.now()}`;
    const payload: Item = sanitizeFirestoreData({
      ...item,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString()
    });
    try {
      await setDoc(doc(db, COLLECTION_PATH, id), payload);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_PATH}/${id}`);
    }
  },

  async updateItem(id: string, updates: Partial<Item>): Promise<void> {
    try {
      const sanitizedUpdates = sanitizeFirestoreData({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, COLLECTION_PATH, id), sanitizedUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}/${id}`);
    }
  },

  async verifyItem(id: string, updates: Partial<Item>, adminEmail?: string): Promise<void> {
    try {
      const sanitizedUpdates = sanitizeFirestoreData({
        ...updates,
        verificationStatus: 'verified',
        verifiedAt: new Date().toISOString(),
        verifiedBy: adminEmail || 'Admin',
        updatedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, COLLECTION_PATH, id), sanitizedUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}/${id}`);
    }
  },

  async deleteItem(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_PATH}/${id}`);
    }
  }
};
