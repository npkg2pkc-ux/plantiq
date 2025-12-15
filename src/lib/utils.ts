import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date
export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Format datetime
export function formatDateTime(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format time (HH:mm) - safely handle various input formats
export function formatTime(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === 0 ||
    value === "0"
  ) {
    return "-";
  }

  const strValue = String(value);

  // Already in HH:mm format
  if (/^\d{1,2}:\d{2}$/.test(strValue)) {
    return strValue;
  }

  // Handle Excel serial time (0.5 = 12:00, etc)
  const numValue = parseFloat(strValue);
  if (!isNaN(numValue) && numValue > 0 && numValue < 1) {
    const totalMinutes = Math.round(numValue * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  // Try parsing as date
  try {
    const date = new Date(strValue);
    if (!isNaN(date.getTime())) {
      // Check if it's the Excel epoch date (1899-12-30)
      if (date.getFullYear() === 1899) {
        return "-";
      }
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    }
  } catch {
    // Ignore parsing errors
  }

  return strValue || "-";
}

// Format number with thousand separator
export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

// Parse number from string (handle Indonesian format with comma as decimal)
// Also handles strings like "20 Jam" by extracting the numeric part
export function parseNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;

  // Convert to string
  const strValue = String(value).trim();

  // Extract numeric part - remove all non-numeric characters except dots and commas
  const numericMatch = strValue.match(/^[\d.,\-]+/);
  if (!numericMatch) return 0;

  // Replace comma with dot for parsing (Indonesian format uses comma as decimal)
  const cleanValue = numericMatch[0].replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

// Format currency
export function formatCurrency(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

// Calculate downtime hours
export function calculateDowntime(jamOff: string, jamStart: string): number {
  if (!jamOff || !jamStart) return 0;

  const [offH, offM] = jamOff.split(":").map(Number);
  const [startH, startM] = jamStart.split(":").map(Number);

  let offMinutes = offH * 60 + offM;
  let startMinutes = startH * 60 + startM;

  // Handle overnight
  if (startMinutes < offMinutes) {
    startMinutes += 24 * 60;
  }

  return Number(((startMinutes - offMinutes) / 60).toFixed(2));
}

// Calculate jam grounded
export function calculateJamGrounded(jamOff: string, jamStart: string): number {
  return calculateDowntime(jamOff, jamStart);
}

// Calculate jam operasi (24 - jam grounded)
export function calculateJamOperasi(jamGrounded: number): number {
  return Number((24 - jamGrounded).toFixed(2));
}

// Generate unique ID
export function generateId(prefix: string = ""): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}${prefix ? "_" : ""}${timestamp}_${random}`;
}

// Generate device ID
export function generateDeviceId(): string {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = generateId("device");
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

// Get month name
export function getMonthName(month: number): string {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return months[month - 1] || "";
}

// Get current date string (YYYY-MM-DD)
export function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Get current year
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Get current month (1-12)
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

// Paginate data
export function paginateData<T>(data: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return data.slice(start, start + perPage);
}

// Calculate total pages
export function calculateTotalPages(
  totalItems: number,
  perPage: number
): number {
  return Math.ceil(totalItems / perPage);
}

// Filter data by search term
export function filterBySearch<T>(
  data: T[],
  searchTerm: string,
  keys: (keyof T)[]
): T[] {
  if (!searchTerm.trim()) return data;

  const term = searchTerm.toLowerCase();
  return data.filter((item) =>
    keys.some((key) => {
      const value = item[key];
      if (typeof value === "string") {
        return value.toLowerCase().includes(term);
      }
      if (typeof value === "number") {
        return value.toString().includes(term);
      }
      return false;
    })
  );
}

// Sort data
export function sortData<T>(
  data: T[],
  key: keyof T,
  direction: "asc" | "desc"
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    const comparison = aVal < bVal ? -1 : 1;
    return direction === "asc" ? comparison : -comparison;
  });
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Check if user has permission
export function hasPermission(
  userRole: string,
  requiredRoles: string[]
): boolean {
  return requiredRoles.includes(userRole);
}

// ============================================
// Permission System
// ============================================

// Type imports for permission checks
import type { PlantType } from "@/types";

// Can Add Data - All roles except manager and eksternal can add
export function canAdd(userRole: string): boolean {
  return ["admin", "supervisor", "avp", "user"].includes(userRole);
}

// Can Edit Data langsung tanpa approval - Admin, AVP, Supervisor
export function canEditDirect(userRole: string): boolean {
  return ["admin", "avp", "supervisor"].includes(userRole);
}

// Can Delete Data langsung tanpa approval - Admin, AVP, Supervisor
export function canDeleteDirect(userRole: string): boolean {
  return ["admin", "avp", "supervisor"].includes(userRole);
}

// Perlu approval untuk edit - User perlu approval
export function needsApprovalForEdit(userRole: string): boolean {
  return userRole === "user";
}

// Perlu approval untuk delete - User perlu approval
export function needsApprovalForDelete(userRole: string): boolean {
  return userRole === "user";
}

// Can Approve requests - AVP, Supervisor, Admin bisa approve
export function canApprove(userRole: string): boolean {
  return ["admin", "supervisor", "avp"].includes(userRole);
}

// Can edit/delete data (backward compatible - untuk UI button visibility)
export function canEditDelete(userRole: string): boolean {
  // Admin, Supervisor, AVP bisa langsung, User bisa tapi perlu approval
  return ["admin", "supervisor", "avp", "user"].includes(userRole);
}

// Is View Only role - Manager dan Eksternal hanya bisa lihat
export function isViewOnly(userRole: string): boolean {
  return ["manager", "eksternal"].includes(userRole);
}

// Can Edit Akun & RKAP - Admin and AVP only, User cannot
export function canEditAkunRKAP(userRole: string, userPlant?: string): boolean {
  // Admin with ALL plant can edit
  if (userRole === "admin" && userPlant === "ALL") return true;
  // AVP can edit (they have plant-specific access)
  if (userRole === "avp") return true;
  // Admin with specific plant can edit (but not user management)
  if (userRole === "admin") return true;
  // Supervisor can edit RKAP for their plant
  if (userRole === "supervisor") return true;
  return false;
}

// Can manage users - Only Admin with ALL plant
export function canManageUsers(userRole: string, userPlant?: string): boolean {
  return userRole === "admin" && userPlant === "ALL";
}

// Can view settings menu (Users, RKAP, etc) - based on role and plant
export function canViewSettings(userRole: string, userPlant?: string): boolean {
  // Admin with ALL plant can see all settings
  if (userRole === "admin" && userPlant === "ALL") return true;
  // Admin with specific plant can see settings except Users
  if (userRole === "admin") return true;
  // AVP and Supervisor can see settings except Users
  if (["avp", "supervisor"].includes(userRole)) return true;
  // User cannot see settings
  return false;
}

// Can view users page
export function canViewUsersPage(
  userRole: string,
  userPlant?: string
): boolean {
  return userRole === "admin" && userPlant === "ALL";
}

// Can view RKAP page
export function canViewRKAPPage(userRole: string): boolean {
  // User role cannot view RKAP page
  return !["user", "manager", "eksternal"].includes(userRole);
}

// Can view all plants
export function canViewAllPlants(
  userRole: string,
  userPlant?: string
): boolean {
  // Admin with ALL, Manager, or Eksternal can view all plants
  if (userRole === "manager" || userRole === "eksternal") return true;
  if (userRole === "admin" && userPlant === "ALL") return true;
  return false;
}

// Get role badge color
export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    avp: "bg-purple-100 text-purple-700",
    manager: "bg-blue-100 text-blue-700",
    supervisor: "bg-green-100 text-green-700",
    user: "bg-gray-100 text-gray-700",
    eksternal: "bg-yellow-100 text-yellow-700",
  };
  return colors[role] || "bg-gray-100 text-gray-700";
}

// Get status badge color
export function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    Open: "bg-yellow-100 text-yellow-700",
    Closed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    Normal: "bg-green-100 text-green-700",
    Warning: "bg-yellow-100 text-yellow-700",
    Critical: "bg-red-100 text-red-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

// Get plant badge color
export function getPlantBadgeColor(plant: string): string {
  const colors: Record<string, string> = {
    NPK1: "bg-blue-100 text-blue-700",
    NPK2: "bg-green-100 text-green-700",
    ALL: "bg-purple-100 text-purple-700",
  };
  return colors[plant] || "bg-gray-100 text-gray-700";
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Local storage helpers
export const storage = {
  get: <T>(key: string): T | null => {
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item as T;
    }
  },
  set: (key: string, value: unknown): void => {
    localStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    );
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
  clear: (): void => {
    localStorage.clear();
  },
};

// Session storage helpers
export const sessionStorage = {
  get: <T>(key: string): T | null => {
    const item = window.sessionStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item as T;
    }
  },
  set: (key: string, value: unknown): void => {
    window.sessionStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    );
  },
  remove: (key: string): void => {
    window.sessionStorage.removeItem(key);
  },
};

// ============================================
// Notification Helper
// ============================================

// Send notification to other users when data is added/updated/deleted
// The user who performs the action will NOT receive the notification
export async function sendNotification(params: {
  message: string;
  fromUser: string;
  fromPlant: string;
  toUser?: string; // specific user or 'ALL' for broadcast
}): Promise<void> {
  try {
    // Dynamically import to avoid circular dependencies
    const { createData, SHEETS } = await import("@/services/api");
    const notification = {
      message: params.message,
      timestamp: new Date().toISOString(),
      read: false,
      fromUser: params.fromUser,
      fromPlant: params.fromPlant,
      toUser: params.toUser || "ALL",
    };
    await createData(SHEETS.NOTIFICATIONS, notification);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}
