export type Role = 'admin' | 'merchandiser';

export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export type UnitType = 'Dus' | 'Box' | 'Pcs';

export interface Store {
  id: string;
  name: string;
  location?: string;
  mapsUrl?: string;
  visitDay?: DayOfWeek;
  visitDays?: DayOfWeek[]; // Multiple visit days per week (e.g. 2x a week: ['Senin', 'Kamis'])
  visitOrder: number; // 1 to 6 (Strict Priority)
  contactPerson?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
  currentStock?: StockOpnameEntry[];
  lastStockUpdated?: string;
  lastStockUpdatedBy?: string;
}

export interface Item {
  id: string;
  barcode: string;
  name: string;
  category?: string;
  boxPerDus: number; // e.g. 1 Dus = 6 Box
  pcsPerBox: number; // e.g. 1 Box = 12 Pcs (so 1 Dus = 72 Pcs)
  priceDus: number;  // Price per Dus (IDR)
  priceBox: number;  // Price per Box (IDR)
  pricePcs: number;  // Price per Pcs (IDR)
  createdAt?: string;
  updatedAt?: string;
  registeredBy?: string; // 'admin' or 'md'
  verificationStatus?: 'pending_admin_verification' | 'verified';
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface StockOpnameEntry {
  itemId: string;
  barcode: string;
  itemName: string;
  inputQty: number;
  inputUnit: UnitType;
  totalPcs: number;
  lastWeekPcs: number; // Previous week benchmark
  notes?: string;
}

export interface SellOutItem {
  itemId: string;
  barcode: string;
  itemName: string;
  qty: number;
  unit: UnitType;
  pricePerUnit: number;
  subtotal: number;
}

export interface SellOutRecord {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: SellOutItem[];
  totalAmount: number;
  timestamp: string;
}

export interface VisitLog {
  id: string;
  storeId: string;
  storeName: string;
  storeLocation: string;
  mdId: string;
  mdName: string;
  visitDay: DayOfWeek;
  visitDate: string; // YYYY-MM-DD
  checkInTime: string; // ISO String or HH:mm
  checkOutTime?: string;
  status: 'in_progress' | 'completed';
  stockEntries: StockOpnameEntry[];
  sellOutRecords: SellOutRecord[];
  totalSellOutAmount: number;
  notes?: string;
  isOfflineSynced?: boolean;
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  role: Role;
  mdCode?: string;
}
