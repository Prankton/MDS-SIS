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
import { VisitLog, StockOpnameEntry, SellOutRecord } from '../types';
import { storeService } from './storeService';

const COLLECTION_PATH = 'visits';

// Returns the actual last recorded stock for THIS specific store
export function getPreviousStockForStore(
  itemId: string, 
  storeId: string, 
  allVisits: VisitLog[] = []
): number {
  const storeCompletedVisits = allVisits.filter(
    v => v.storeId === storeId && v.status === 'completed'
  );
  storeCompletedVisits.sort((a, b) => 
    new Date(b.checkOutTime || b.createdAt || 0).getTime() - 
    new Date(a.checkOutTime || a.createdAt || 0).getTime()
  );

  for (const v of storeCompletedVisits) {
    const entry = v.stockEntries?.find(e => e.itemId === itemId);
    if (entry && typeof entry.totalPcs === 'number') {
      return entry.totalPcs;
    }
  }

  return 0; // If no previous visit recorded for this store, 0 Pcs
}

// Backwards compatibility alias
export function getMockPreviousWeekStock(itemId: string, storeId: string, allVisits?: VisitLog[]): number {
  return getPreviousStockForStore(itemId, storeId, allVisits || []);
}

export const visitService = {
  subscribeVisits(callback: (visits: VisitLog[]) => void, onError?: (err: Error) => void) {
    const colRef = collection(db, COLLECTION_PATH);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const visits = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VisitLog[];
        // Sort descending by checkInTime / createdAt
        visits.sort((a, b) => new Date(b.checkInTime || b.createdAt || 0).getTime() - new Date(a.checkInTime || a.createdAt || 0).getTime());
        callback(visits);
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

  async startVisit(visit: Omit<VisitLog, 'id'>): Promise<string> {
    const id = `visit-${Date.now()}`;
    const payload: VisitLog = sanitizeFirestoreData({
      ...visit,
      id,
      status: 'in_progress',
      checkInTime: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    try {
      await setDoc(doc(db, COLLECTION_PATH, id), payload);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_PATH}/${id}`);
    }
  },

  async saveVisitDraft(id: string, updates: Partial<VisitLog>): Promise<void> {
    try {
      const sanitizedUpdates = sanitizeFirestoreData({
        ...updates
      });
      await updateDoc(doc(db, COLLECTION_PATH, id), sanitizedUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}/${id}`);
    }
  },

  async completeVisit(
    id: string, 
    stockEntries: StockOpnameEntry[], 
    sellOutRecords: SellOutRecord[],
    notes?: string,
    storeId?: string,
    mdName?: string
  ): Promise<void> {
    const totalSellOutAmount = sellOutRecords.reduce((sum, r) => sum + r.totalAmount, 0);
    try {
      const sanitizedData = sanitizeFirestoreData({
        status: 'completed',
        checkOutTime: new Date().toISOString(),
        stockEntries,
        sellOutRecords,
        totalSellOutAmount,
        notes: notes || '',
        isOfflineSynced: true
      });
      await updateDoc(doc(db, COLLECTION_PATH, id), sanitizedData);

      // Update dedicated store stock record in Firestore
      if (storeId) {
        await storeService.updateStoreStock(storeId, stockEntries, mdName);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}/${id}`);
    }
  },

  async deleteVisit(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_PATH}/${id}`);
    }
  }
};
