import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  User,
  PlantType,
  UserRole,
  Notification,
  ChatMessage,
} from "@/types";

// Auth Store
interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  sessionId: string | null;
  deviceId: string | null;
  login: (user: User, sessionId: string, deviceId: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      sessionId: null,
      deviceId: null,
      login: (user, sessionId, deviceId) =>
        set({ isLoggedIn: true, user, sessionId, deviceId }),
      logout: () =>
        set({ isLoggedIn: false, user: null, sessionId: null, deviceId: null }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: "auth-storage",
    }
  )
);

// UI Store
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeTab: string;
  dashboardPlantFilter: PlantType;
  dashboardYear: number;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setActiveTab: (tab: string) => void;
  setDashboardPlantFilter: (plant: PlantType) => void;
  setDashboardYear: (year: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  activeTab: "dashboard",
  dashboardPlantFilter: "ALL",
  dashboardYear: new Date().getFullYear(),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSidebarCollapse: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDashboardPlantFilter: (plant) => set({ dashboardPlantFilter: plant }),
  setDashboardYear: (year) => set({ dashboardYear: year }),
}));

// Notification Store
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  setNotifications: (notifications: Notification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
}));

// Chat Store
interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  toggleChat: () => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isOpen: false,
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
}));

// Data Store (for caching)
interface DataState {
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDataStore = create<DataState>((set) => ({
  loading: false,
  error: null,
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// Helper hooks
export const useUserRole = (): UserRole => {
  const user = useAuthStore((state) => state.user);
  return user?.role || "user";
};

export const useUserPlant = (): PlantType => {
  const user = useAuthStore((state) => state.user);
  return user?.plant || "NPK2";
};

export const useIsLoggedIn = (): boolean => {
  return useAuthStore((state) => state.isLoggedIn);
};
