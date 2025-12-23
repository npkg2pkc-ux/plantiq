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
  darkMode: boolean;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setActiveTab: (tab: string) => void;
  setDashboardPlantFilter: (plant: PlantType) => void;
  setDashboardYear: (year: number) => void;
  toggleDarkMode: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      activeTab: "dashboard",
      dashboardPlantFilter: "ALL",
      dashboardYear: new Date().getFullYear(),
      darkMode: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleSidebarCollapse: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setDashboardPlantFilter: (plant) => set({ dashboardPlantFilter: plant }),
      setDashboardYear: (year) => set({ dashboardYear: year }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({ darkMode: state.darkMode }),
    }
  )
);

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

// Chat Store with persistence for instant loading
interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  unreadChatCount: number;
  lastReadTimestamp: string | null;
  lastFetchTimestamp: string | null;
  toggleChat: () => void;
  addMessage: (message: ChatMessage) => void;
  addOptimisticMessage: (message: ChatMessage) => void;
  removeOptimisticMessage: (tempId: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setUnreadChatCount: (count: number) => void;
  markChatAsRead: () => void;
  setLastFetchTimestamp: (timestamp: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isOpen: false,
      unreadChatCount: 0,
      lastReadTimestamp: null,
      lastFetchTimestamp: null,
      toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
      addMessage: (message) =>
        set((state) => {
          // Avoid duplicate messages
          const exists = state.messages.some((m) => m.id === message.id);
          if (exists) return state;
          return { messages: [...state.messages, message] };
        }),
      addOptimisticMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      removeOptimisticMessage: (tempId) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== tempId),
        })),
      setMessages: (newMessages) =>
        set((state) => {
          // Keep optimistic messages (those with temp_ prefix) that aren't synced yet
          const optimisticMessages = state.messages.filter(
            (m) => m.id && m.id.startsWith("temp_")
          );

          // Check if optimistic message content exists in new messages from server
          // If yes, it means server has synced, so we can remove the optimistic one
          const unSyncedOptimistic = optimisticMessages.filter((opt) => {
            // Check if there's a server message with same sender, message, and similar timestamp
            const synced = newMessages.some(
              (serverMsg) =>
                serverMsg.sender === opt.sender &&
                serverMsg.message === opt.message &&
                Math.abs(
                  new Date(serverMsg.timestamp).getTime() -
                    new Date(opt.timestamp).getTime()
                ) < 5000 // Within 5 seconds
            );
            return !synced; // Keep if NOT synced yet
          });

          // Merge: server messages + unsynced optimistic messages
          const mergedMessages = [...newMessages, ...unSyncedOptimistic];

          // Sort by timestamp
          mergedMessages.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          return { messages: mergedMessages };
        }),
      setUnreadChatCount: (count) => set({ unreadChatCount: count }),
      markChatAsRead: () =>
        set({
          unreadChatCount: 0,
          lastReadTimestamp: new Date().toISOString(),
        }),
      setLastFetchTimestamp: (timestamp) =>
        set({ lastFetchTimestamp: timestamp }),
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        messages: state.messages.slice(-100), // Keep last 100 messages in cache
        lastFetchTimestamp: state.lastFetchTimestamp,
      }),
    }
  )
);

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
