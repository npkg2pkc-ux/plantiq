// ============================================
// Data Models & Interfaces
// ============================================

export type PlantType = "NPK1" | "NPK2" | "ALL";
export type UserRole =
  | "admin"
  | "supervisor"
  | "user"
  | "avp"
  | "manager"
  | "eksternal";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type TroubleStatus = "Open" | "Closed" | "In Progress" | "Pending";
export type VibrasiStatus = "Normal" | "Warning" | "Critical" | "Alert";

// Dokumentasi Foto
export interface DokumentasiFoto {
  id?: string;
  tanggal: string;
  judul: string;
  keterangan?: string;
  fileId: string;
  fileUrl: string;
  folderId?: string;
  folderUrl?: string;
  thumbnailUrl?: string;
  uploadBy: string;
  plant?: PlantType;
  _plant?: PlantType;
  createdAt?: string;
}

// Produksi NPK Granul
export interface ProduksiNPK {
  id?: string;
  tanggal: string;
  shiftMalamOnspek: number;
  shiftMalamOffspek: number;
  shiftPagiOnspek: number;
  shiftPagiOffspek: number;
  shiftSoreOnspek: number;
  shiftSoreOffspek: number;
  totalOnspek?: number;
  totalOffspek?: number;
  total?: number;
  _plant?: PlantType;
}

// Produksi Blending/Retail
export interface ProduksiBlending {
  id?: string;
  tanggal: string;
  kategori: string;
  formula: string;
  tonase: number;
  _plant?: PlantType;
}

// Produksi NPK Mini
export interface ProduksiNPKMini {
  id?: string;
  tanggal: string;
  formulasi: string;
  tonase: number;
  _plant?: PlantType;
}

// Timesheet Forklift
export interface TimesheetForklift {
  id?: string;
  tanggal: string;
  forklift: string;
  deskripsiTemuan: string;
  jamOff: string;
  jamStart: string;
  jamGrounded?: number;
  jamOperasi?: number;
  keterangan?: string;
  _plant?: PlantType;
}

// Timesheet Loader
export interface TimesheetLoader {
  id?: string;
  tanggal: string;
  shift: string;
  deskripsiTemuan: string;
  jamOff: string;
  jamStart: string;
  jamGrounded?: number;
  jamOperasi?: number;
  keterangan?: string;
  _plant?: PlantType;
}

// Downtime
export interface Downtime {
  id?: string;
  tanggal: string;
  item: string;
  deskripsi: string;
  jamOff: string;
  jamStart: string;
  downtime?: number;
  _plant?: PlantType;
}

// Work Request
export interface WorkRequest {
  id?: string;
  tanggal: string;
  nomorWR: string;
  item: string;
  area: string;
  eksekutor: string;
  include: string;
  keterangan: string;
  _plant?: PlantType;
}

// Bahan Baku
export interface BahanBaku {
  id?: string;
  tanggal: string;
  namaBarang: string;
  namaBarangLainnya?: string;
  jumlah: number;
  satuan: string;
  keterangan?: string;
  _plant?: PlantType;
}

// Vibrasi
export interface Vibrasi {
  id?: string;
  tanggal: string;
  namaEquipment: string;
  posisiPengukuran: string;
  pointPengukuran: string;
  nilaiVibrasi: number;
  status: VibrasiStatus;
  keterangan?: string;
  _plant?: PlantType;
}

// Gate Pass
export interface GatePass {
  id?: string;
  tanggal: string;
  nomorGatePass: string;
  noPolisi: string;
  pemilikBarang: string;
  namaPembawa: string;
  mengetahui: string;
  deskripsiBarang: string;
  alasanKeluar: string;
  _plant?: PlantType;
}

// Akun (Password Storage)
export interface Akun {
  id?: string;
  noBadge: string;
  nama: string;
  jabatan: string;
  passwordESS: string;
  passwordPismart: string;
  passwordDOF: string;
  tanggalUpdate: string;
}

// RKAP (Target)
export interface RKAP {
  id?: string;
  tahun: string | number;
  plant?: PlantType;
  _plant?: PlantType;
  januari?: number;
  februari?: number;
  maret?: number;
  april?: number;
  mei?: number;
  juni?: number;
  juli?: number;
  agustus?: number;
  september?: number;
  oktober?: number;
  november?: number;
  desember?: number;
  total?: number;
}

// Perta (Legacy - keep for backward compatibility)
export interface Perta {
  id?: string;
  tanggal: string;
  nomorPerta: string;
  shift?: string;
  jenisBBM?: string;
  deskripsi: string;
  volumeAwal?: number;
  volumePengisian?: number;
  volumePemakaian?: number;
  volumeAkhir?: number;
  keterangan?: string;
  status: TroubleStatus;
  _plant?: PlantType;
}

// Perbaikan Tahunan (New)
export interface PerbaikanTahunanItem {
  item: string;
  deskripsi: string;
}

export interface PerbaikanTahunan {
  id?: string;
  tanggalMulai: string;
  items: PerbaikanTahunanItem[];
  tanggalSelesai: string;
  jumlahHari: number;
  _plant?: PlantType;
}

// Trouble Record
export interface TroubleRecord {
  id?: string;
  nomorBerkas: string;
  tanggal?: string;
  tanggalKejadian: string;
  shift?: string;
  waktuKejadian?: string;
  kodePeralatan: string;
  area?: string;
  pic?: string;
  deskripsiMasalah: string;
  penyebab?: string;
  tindakan?: string;
  targetSelesai?: string;
  keterangan?: string;
  status: TroubleStatus;
  tanggalSelesai?: string;
  catatanPenyelesaian?: string;
  _plant?: PlantType;
}

// User
export interface User {
  id?: string;
  username?: string;
  password?: string;
  nama?: string;
  email?: string;
  role: UserRole;
  namaLengkap?: string;
  status: "active" | "inactive";
  plant: PlantType;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Approval Request
export interface ApprovalRequest {
  id?: string;
  requestBy: string;
  requestByName: string;
  requestDate: string;
  action: "edit" | "delete";
  sheetType: string;
  dataId: string;
  dataPreview: string;
  reason: string;
  status: ApprovalStatus;
  reviewBy?: string;
  reviewDate?: string;
  reviewNotes?: string;
  requesterPlant?: PlantType;
}

// Monthly Note
export interface MonthlyNote {
  id?: string;
  bulan: string;
  tahun: string;
  plant: PlantType;
  catatan: string;
  updatedBy: string;
  updatedAt: string;
}

// Chat Message
export interface ChatMessage {
  id: string;
  sender: string;
  role: string;
  message: string;
  timestamp: string;
}

// Notification
export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  fromUser?: string;
  fromPlant?: PlantType;
  toUser?: string;
}

// Session
export interface Session {
  id: string;
  username: string;
  deviceId: string;
  browser: string;
  createdAt: string;
  lastActivity: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  totalProduksi: number;
  totalRKAP: number;
  percentage: number;
  totalDowntime: number;
  totalWorkRequests: number;
  monthlyBreakdown: MonthlyData[];
}

export interface MonthlyData {
  bulan: string;
  produksi: number;
  rkap: number;
}

// Navigation Item
export interface NavItem {
  name: string;
  path: string;
  icon: string;
  children?: NavItem[];
}

// Table Column
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => unknown;
  sortable?: boolean;
  width?: string;
}

// Form Field
export interface FormField {
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "textarea"
    | "time"
    | "password";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Print Config
export interface PrintConfig {
  startDate: string;
  endDate: string;
  supervisorName?: string;
  supervisorBadge?: string;
}
