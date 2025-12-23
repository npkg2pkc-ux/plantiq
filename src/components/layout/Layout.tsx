import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Factory,
  FileText,
  Database,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut,
  Bell,
  MessageCircle,
  User,
  ChevronLeft,
  Send,
  X,
  Sun,
  Moon,
  Users,
  Circle,
} from "lucide-react";
import {
  cn,
  canViewSettings,
  canViewUsersPage,
  canViewRKAPPage,
  formatDateTime,
} from "@/lib/utils";
import {
  useAuthStore,
  useUIStore,
  useNotificationStore,
  useChatStore,
} from "@/stores";
import { Badge } from "@/components/ui";

// ============================================
// ACTIVE USERS MARQUEE COMPONENT
// ============================================
interface ActiveUser {
  id: string;
  username: string;
  namaLengkap: string;
  role: string;
  plant: string;
  lastActive: string;
  status: string;
}

const ActiveUsersMarquee = () => {
  const { user } = useAuthStore();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  // Update current user's active status
  const updateMyStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { readData, createData, updateData, SHEETS } = await import(
        "@/services/api"
      );

      // Check if user already exists in active_users
      const result = await readData(SHEETS.ACTIVE_USERS);
      const existingUsers = (result.data as ActiveUser[]) || [];
      const existingUser = existingUsers.find(
        (u) => u.username === user.username
      );

      const now = new Date().toISOString();

      if (existingUser) {
        // Update existing record
        await updateData(SHEETS.ACTIVE_USERS, {
          id: existingUser.id,
          lastActive: now,
          status: "online",
        });
      } else {
        // Create new record
        await createData(SHEETS.ACTIVE_USERS, {
          username: user.username,
          namaLengkap: user.namaLengkap || user.nama || user.username,
          role: user.role,
          plant: user.plant,
          lastActive: now,
          status: "online",
        });
      }
    } catch (error) {
      console.error("Error updating active status:", error);
    }
  }, [user]);

  // Fetch active users
  const fetchActiveUsers = useCallback(async () => {
    try {
      const { readData, SHEETS } = await import("@/services/api");
      const result = await readData(SHEETS.ACTIVE_USERS);

      if (result.success && result.data) {
        const users = result.data as ActiveUser[];
        const now = new Date().getTime();
        const TIMEOUT = 2 * 60 * 1000; // 2 minutes timeout

        // Filter only users active within last 2 minutes
        const onlineUsers = users.filter((u) => {
          const lastActive = new Date(u.lastActive).getTime();
          return now - lastActive < TIMEOUT;
        });

        setActiveUsers(onlineUsers);
      }
    } catch (error) {
      console.error("Error fetching active users:", error);
    }
  }, []);

  // Update status on mount and periodically
  useEffect(() => {
    if (user) {
      // Update immediately
      updateMyStatus();
      fetchActiveUsers();

      // Update every 30 seconds
      const statusInterval = setInterval(updateMyStatus, 30000);
      // Fetch active users every 15 seconds
      const fetchInterval = setInterval(fetchActiveUsers, 15000);

      return () => {
        clearInterval(statusInterval);
        clearInterval(fetchInterval);
      };
    }
  }, [user, updateMyStatus, fetchActiveUsers]);

  // Set status to offline on unmount/close
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (user) {
        try {
          const { readData, updateData, SHEETS } = await import(
            "@/services/api"
          );
          const result = await readData(SHEETS.ACTIVE_USERS);
          const existingUsers = (result.data as ActiveUser[]) || [];
          const existingUser = existingUsers.find(
            (u) => u.username === user.username
          );
          if (existingUser) {
            await updateData(SHEETS.ACTIVE_USERS, {
              id: existingUser.id,
              status: "offline",
            });
          }
        } catch (error) {
          console.error("Error setting offline status:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user]);

  if (activeUsers.length === 0) return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "supervisor":
        return "bg-blue-500";
      case "manager":
        return "bg-purple-500";
      case "avp":
        return "bg-emerald-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPlantBadgeColor = (plant: string) => {
    switch (plant) {
      case "NPK1":
        return "bg-orange-500";
      case "NPK2":
        return "bg-cyan-500";
      case "ALL":
        return "bg-gradient-to-r from-orange-500 to-cyan-500";
      default:
        return "bg-gray-500";
    }
  };

  // Duplicate content for seamless loop (3x for smoother transition)
  const marqueeContent = [...activeUsers, ...activeUsers, ...activeUsers];

  return (
    <div
      className="bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 text-white overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center h-8">
        {/* Fixed Label */}
        <div className="flex-shrink-0 flex items-center gap-2 px-4 bg-primary-700/50 h-full border-r border-white/20 z-10">
          <Users className="h-4 w-4" />
          <span className="text-xs font-semibold whitespace-nowrap">
            Online ({activeUsers.length})
          </span>
        </div>

        {/* Scrolling Content - Using CSS animation for smooth infinite scroll */}
        <div className="flex-1 overflow-hidden relative">
          <div
            className={cn(
              "flex items-center gap-6 whitespace-nowrap animate-marquee",
              isPaused && "animation-paused"
            )}
            style={{
              animationDuration: `${Math.max(activeUsers.length * 8, 15)}s`,
            }}
          >
            {marqueeContent.map((activeUser, index) => (
              <div
                key={`${activeUser.username}-${index}`}
                className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm flex-shrink-0"
              >
                {/* Online indicator */}
                <Circle className="h-2 w-2 fill-green-400 text-green-400 animate-pulse" />

                {/* User info */}
                <span className="text-xs font-medium">
                  {activeUser.namaLengkap}
                </span>

                {/* Role badge */}
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium uppercase",
                    getRoleBadgeColor(activeUser.role)
                  )}
                >
                  {activeUser.role}
                </span>

                {/* Plant badge */}
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium",
                    getPlantBadgeColor(activeUser.plant)
                  )}
                >
                  {activeUser.plant}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// NAVIGATION ITEMS
// ============================================
interface NavItemProps {
  name: string;
  path: string;
  icon: React.ReactNode;
  children?: { name: string; path: string }[];
}

const navItems: NavItemProps[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    name: "Produksi",
    path: "/produksi",
    icon: <Factory className="h-5 w-5" />,
    children: [
      { name: "NPK Granul 1", path: "/produksi/npk1" },
      { name: "NPK Granul 2", path: "/produksi/npk2" },
      { name: "Blending", path: "/produksi/blending" },
      { name: "NPK Mini", path: "/produksi/npk-mini" },
      { name: "Retail", path: "/produksi/retail" },
    ],
  },
  {
    name: "Laporan",
    path: "/laporan",
    icon: <FileText className="h-5 w-5" />,
    children: [
      { name: "KOP NPK1", path: "/laporan/kop-npk1" },
      { name: "KOP NPK2", path: "/laporan/kop-npk2" },
      {
        name: "Timesheet Forklift NPK1",
        path: "/laporan/timesheet-forklift-npk1",
      },
      {
        name: "Timesheet Forklift NPK2",
        path: "/laporan/timesheet-forklift-npk2",
      },
      { name: "Timesheet Loader NPK1", path: "/laporan/timesheet-loader-npk1" },
      { name: "Timesheet Loader NPK2", path: "/laporan/timesheet-loader-npk2" },
      { name: "Downtime NPK1", path: "/laporan/downtime-npk1" },
      { name: "Downtime NPK2", path: "/laporan/downtime-npk2" },
      { name: "Pemantauan BB NPK1", path: "/laporan/pemantauan-bb-npk1" },
      { name: "Pemantauan BB NPK2", path: "/laporan/pemantauan-bb-npk2" },
    ],
  },
  {
    name: "Data",
    path: "/data",
    icon: <Database className="h-5 w-5" />,
    children: [
      { name: "Work Request NPK1", path: "/data/work-request-npk1" },
      { name: "Work Request NPK2", path: "/data/work-request-npk2" },
      { name: "Bahan Baku NPK1", path: "/data/bahan-baku-npk1" },
      { name: "Bahan Baku NPK2", path: "/data/bahan-baku-npk2" },
      { name: "Vibrasi NPK1", path: "/data/vibrasi-npk1" },
      { name: "Vibrasi NPK2", path: "/data/vibrasi-npk2" },
      { name: "Gate Pass NPK1", path: "/data/gate-pass-npk1" },
      { name: "Gate Pass NPK2", path: "/data/gate-pass-npk2" },
      { name: "Perbaikan Tahunan NPK1", path: "/data/perbaikan-tahunan-npk1" },
      { name: "Perbaikan Tahunan NPK2", path: "/data/perbaikan-tahunan-npk2" },
      { name: "Trouble Record NPK1", path: "/data/trouble-record-npk1" },
      { name: "Trouble Record NPK2", path: "/data/trouble-record-npk2" },
      { name: "Dokumentasi Foto NPK1", path: "/data/dokumentasi-foto-npk1" },
      { name: "Dokumentasi Foto NPK2", path: "/data/dokumentasi-foto-npk2" },
      { name: "Rekap BBM NPK1", path: "/data/rekap-bbm-npk1" },
      { name: "Rekap BBM NPK2", path: "/data/rekap-bbm-npk2" },
    ],
  },
  {
    name: "Pengaturan",
    path: "/settings",
    icon: <Settings className="h-5 w-5" />,
    children: [
      { name: "Profil", path: "/settings/akun" },
      { name: "RKAP", path: "/settings/rkap" },
      { name: "Users", path: "/settings/users" },
      { name: "Approval", path: "/settings/approval" },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Produksi",
    "Laporan",
    "Data",
    "Pengaturan",
  ]);
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore();

  // Filter menu items based on user's plant and role
  const getFilteredNavItems = () => {
    const userPlant = user?.plant;
    const userRole = user?.role || "";

    return navItems
      .map((item) => {
        // Filter Settings menu based on role and plant
        if (item.name === "Pengaturan") {
          if (!canViewSettings(userRole, userPlant)) {
            return null; // Hide settings for user role and view-only roles
          }

          // Filter settings children based on permissions
          if (item.children) {
            const filteredChildren = item.children.filter((child) => {
              // Users page - only for Admin with ALL plant
              if (child.path === "/settings/users") {
                return canViewUsersPage(userRole, userPlant);
              }
              // RKAP page - not for user role
              if (child.path === "/settings/rkap") {
                return canViewRKAPPage(userRole);
              }
              // Akun and Approval - visible for admin, avp, supervisor
              return true;
            });

            if (filteredChildren.length === 0) return null;
            return { ...item, children: filteredChildren };
          }
          return item;
        }

        // Filter Produksi menu based on plant
        if (item.name === "Produksi" && item.children) {
          let filteredChildren = item.children;

          if (userPlant === "NPK1") {
            // NPK1: Produksi NPK1 dan Retail saja
            filteredChildren = item.children.filter(
              (child) =>
                child.path === "/produksi/npk1" ||
                child.path === "/produksi/retail"
            );
          } else if (userPlant === "NPK2") {
            // NPK2: Produksi NPK2, Blending, NPK Mini
            filteredChildren = item.children.filter(
              (child) =>
                child.path === "/produksi/npk2" ||
                child.path === "/produksi/blending" ||
                child.path === "/produksi/npk-mini"
            );
          }
          // Admin (ALL) sees everything
          return { ...item, children: filteredChildren };
        }

        // Filter Laporan menu based on plant
        if (item.name === "Laporan" && item.children) {
          let filteredChildren = item.children;

          if (userPlant === "NPK1") {
            // NPK1: Only show NPK1 reports
            filteredChildren = item.children.filter((child) =>
              child.path.includes("npk1")
            );
          } else if (userPlant === "NPK2") {
            // NPK2: Only show NPK2 reports
            filteredChildren = item.children.filter((child) =>
              child.path.includes("npk2")
            );
          }
          // Admin (ALL) sees all
          return { ...item, children: filteredChildren };
        }

        // Filter Data menu based on plant
        if (item.name === "Data" && item.children) {
          let filteredChildren = item.children;

          if (userPlant === "NPK1") {
            // NPK1: Only show NPK1 data forms
            filteredChildren = item.children.filter((child) =>
              child.path.includes("npk1")
            );
          } else if (userPlant === "NPK2") {
            // NPK2: Only show NPK2 data forms
            filteredChildren = item.children.filter((child) =>
              child.path.includes("npk2")
            );
          }
          // Admin (ALL) sees all
          return { ...item, children: filteredChildren };
        }

        return item;
      })
      .filter(Boolean) as NavItemProps[];
  };

  const filteredNavItems = getFilteredNavItems();

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItemProps) => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path);
    }
    return location.pathname === item.path;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-dark-800 border-r border-dark-100 dark:border-dark-700 transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-dark-100 dark:border-dark-700">
        {!sidebarCollapsed && (
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/favicon.png" alt="PlantIQ Logo" className="h-9 w-9" />
            <span className="font-display font-bold text-dark-900 dark:text-white">
              Plantiffy
            </span>
            <span className="text-xs text-dark-500 dark:text-dark-400">
              v2.2.5
            </span>
          </Link>
        )}
        <button
          onClick={toggleSidebarCollapse}
          className="p-2 text-dark-500 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
        {filteredNavItems.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <>
                <button
                  onClick={() => !sidebarCollapsed && toggleExpand(item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                    isParentActive(item)
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                      : "text-dark-600 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700 hover:text-dark-900 dark:hover:text-white"
                  )}
                >
                  {item.icon}
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          expandedItems.includes(item.name) && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>
                {!sidebarCollapsed && (
                  <AnimatePresence>
                    {expandedItems.includes(item.name) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-12 py-1 space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={cn(
                                "block px-4 py-2 text-sm rounded-lg transition-colors",
                                isActive(child.path)
                                  ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 font-medium"
                                  : "text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white hover:bg-dark-50 dark:hover:bg-dark-700"
                              )}
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </>
            ) : (
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                  isActive(item.path)
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 shadow-sm"
                    : "text-dark-600 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700 hover:text-dark-900 dark:hover:text-white"
                )}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode } =
    useUIStore();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    setNotifications,
  } = useNotificationStore();
  const {
    isOpen: chatOpen,
    toggleChat,
    unreadChatCount,
    setUnreadChatCount,
    markChatAsRead,
  } = useChatStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Handle mark notification as read - also update backend.
  const handleMarkAsRead = async (notifId: string) => {
    try {
      // Update local state first for instant feedback.
      markAsRead(notifId);

      // Update backend
      const { updateData, SHEETS } = await import("@/services/api");
      await updateData(SHEETS.NOTIFICATIONS, { id: notifId, read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Handle mark all notifications as read - also update backend
  const handleMarkAllAsRead = async () => {
    try {
      // Update local state first for instant feedback
      markAllAsRead();

      // Update backend for all unread notifications
      const { updateData, SHEETS } = await import("@/services/api");
      const unreadNotifs = notifications.filter((n) => !n.read);
      for (const notif of unreadNotifs) {
        await updateData(SHEETS.NOTIFICATIONS, { id: notif.id, read: true });
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Load notifications from backend
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { readData, SHEETS } = await import("@/services/api");
        const result = await readData(SHEETS.NOTIFICATIONS);
        if (result.success && result.data) {
          // Filter notifications for current user (exclude self-generated)
          // User should NOT see their own notifications
          const userNotifications = (result.data as any[]).filter((n) => {
            // Exclude notifications created by the current user
            if (n.fromUser === user?.username) {
              return false;
            }
            // Include if targeted to ALL or specifically to this user
            if (n.toUser === "ALL" || n.toUser === user?.username) {
              return true;
            }
            // Include if from same plant (broadcast within plant)
            if (n.fromPlant === user?.plant) {
              return true;
            }
            return false;
          });
          // Sort by timestamp descending
          const sorted = userNotifications.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setNotifications(sorted);
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    if (user) {
      loadNotifications();
      // Refresh every 10 seconds for better real-time feel
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user, setNotifications]);

  // Background polling for chat messages (to update badge count)
  // Each user has their own lastReadTimestamp stored in localStorage
  // This ensures User A reading chat doesn't affect User B, C, D's badge
  // Also pre-fetches messages for instant display when chat opens
  useEffect(() => {
    const loadChatMessages = async () => {
      if (!user) return;

      try {
        const { readData, SHEETS } = await import("@/services/api");
        const result = await readData(SHEETS.CHAT_MESSAGES);
        if (result.success && result.data) {
          const messages = result.data as any[];

          // Sort messages by timestamp (oldest first)
          const sortedMessages = [...messages].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Pre-cache messages in store for instant display
          // This makes chat open instantly without loading
          const { setMessages, setLastFetchTimestamp } =
            useChatStore.getState();
          setMessages(sortedMessages);
          setLastFetchTimestamp(new Date().toISOString());

          // Calculate unread count for badge
          const lastReadKey = `chat_last_read_${user.username}`;
          const lastRead = localStorage.getItem(lastReadKey);
          const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

          const currentUserDisplayName =
            user.namaLengkap || user.nama || user.username;

          const unreadCount = messages.filter((msg) => {
            if (msg.sender === currentUserDisplayName) return false;
            const msgTime = new Date(msg.timestamp).getTime();
            return msgTime > lastReadTime;
          }).length;

          setUnreadChatCount(unreadCount);
        }
      } catch (error) {
        console.error("Error loading chat messages:", error);
      }
    };

    if (user) {
      // Always load messages in background for instant access
      loadChatMessages();
      // Poll every 3 seconds for real-time updates
      const interval = setInterval(loadChatMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [user, setUnreadChatCount]);

  // Close notification panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className={cn(
        "fixed top-8 right-0 z-30 h-16 bg-white/80 dark:bg-dark-800/80 backdrop-blur-md border-b border-dark-100 dark:border-dark-700 transition-all duration-300",
        sidebarCollapsed ? "left-20" : "left-64"
      )}
    >
      <div className="h-full px-6 flex items-center justify-between">
        {/* Mobile menu button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-dark-500 hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search placeholder */}
        <div className="hidden md:block" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "text-dark-500 hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-700"
            )}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Chat */}
          <button
            onClick={toggleChat}
            className={cn(
              "relative p-2 rounded-lg transition-colors",
              chatOpen
                ? "bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400"
                : "text-dark-500 hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-700"
            )}
          >
            <MessageCircle className="h-5 w-5" />
            {unreadChatCount > 0 && !chatOpen && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {unreadChatCount > 9 ? "9+" : unreadChatCount}
              </span>
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative p-2 rounded-lg transition-colors",
                showNotifications
                  ? "bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400"
                  : "text-dark-500 hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-700"
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Panel */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-dark-100 dark:border-dark-700 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-dark-100 dark:border-dark-700 flex items-center justify-between">
                    <h3 className="font-semibold text-dark-900 dark:text-white">
                      Notifikasi
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-dark-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Tidak ada notifikasi</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleMarkAsRead(notif.id)}
                          className={cn(
                            "px-4 py-3 border-b border-dark-50 dark:border-dark-700 cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors",
                            !notif.read &&
                              "bg-primary-50 dark:bg-primary-900/30"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                                notif.read
                                  ? "bg-dark-300 dark:bg-dark-500"
                                  : "bg-primary-500"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-dark-700 dark:text-dark-200 line-clamp-2">
                                {notif.message}
                              </p>
                              <p className="text-xs text-dark-400 mt-1">
                                {formatDateTime(notif.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-dark-50 dark:hover:bg-dark-700 rounded-xl transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-dark-900 dark:text-white">
                  {user?.namaLengkap}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 capitalize">
                  {user?.role}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-dark-400" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-dark-100 dark:border-dark-700 py-2 z-50"
                >
                  <div className="px-4 py-2 border-b border-dark-100 dark:border-dark-700">
                    <p className="text-sm font-medium text-dark-900 dark:text-white">
                      {user?.namaLengkap}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="primary" size="sm">
                        {user?.role}
                      </Badge>
                      <Badge variant="info" size="sm">
                        {user?.plant}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

// Chat Panel Component
// Each user has independent read tracking via localStorage
// User A reading chat does NOT affect User B, C, D's unread badge
// Uses optimistic UI for instant message display
const ChatPanel = () => {
  const { user } = useAuthStore();
  const {
    messages,
    isOpen,
    toggleChat,
    addOptimisticMessage,
    removeOptimisticMessage,
    setMessages,
    setUnreadChatCount,
  } = useChatStore();
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const prevMessagesLengthRef = useRef(0);

  // Check if user is near the bottom of chat
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  };

  // Handle scroll event to detect if user is reading old messages
  const handleScroll = () => {
    setIsUserScrolling(!isNearBottom());
  };

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Mark chat as read ONLY for current user when panel opens
  // This updates only the current user's lastReadTimestamp in localStorage
  // Other users' badges remain unaffected
  useEffect(() => {
    if (isOpen && user) {
      // Save last read timestamp to localStorage for THIS user only
      // Key format: chat_last_read_<username>
      // Each user has their own key, so marking as read for User A
      // does NOT affect User B, C, D, etc.
      const lastReadKey = `chat_last_read_${user.username}`;
      const now = new Date().toISOString();
      localStorage.setItem(lastReadKey, now);

      // Only reset THIS user's unread count in the UI
      setUnreadChatCount(0);

      // Scroll to bottom when chat first opens
      setTimeout(() => scrollToBottom("auto"), 100);
    }
  }, [isOpen, user, setUnreadChatCount]);

  // Also update lastReadTimestamp when new messages arrive while chat is open
  // This ensures badge stays at 0 when user is actively viewing chat
  useEffect(() => {
    if (isOpen && user && messages.length > 0) {
      const lastReadKey = `chat_last_read_${user.username}`;
      localStorage.setItem(lastReadKey, new Date().toISOString());
    }
  }, [isOpen, user, messages.length]);

  // Smart scroll: only scroll to bottom if user is not reading old messages
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    // Only auto-scroll if:
    // 1. There are new messages AND
    // 2. User is NOT scrolling up to read old messages (is near bottom)
    if (hasNewMessages && !isUserScrolling) {
      scrollToBottom();
    }
  }, [messages, isUserScrolling]);

  // Messages are pre-loaded by background polling in Header component
  // Just refresh periodically when chat is open for real-time updates
  useEffect(() => {
    if (isOpen) {
      // Auto-refresh every 3 seconds for real-time feel
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchMessages = async () => {
    try {
      const { readData, SHEETS } = await import("@/services/api");
      const result = await readData(SHEETS.CHAT_MESSAGES);
      if (result.success && result.data) {
        // Sort by timestamp
        const sortedMessages = [...(result.data as any[])].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    // Use consistent sender name (namaLengkap > nama > username)
    const senderName = user.namaLengkap || user.nama || user.username;
    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const messageText = newMessage.trim();

    // Create optimistic message for instant display
    const optimisticMessage = {
      id: tempId,
      sender: senderName,
      role: user.role,
      message: messageText,
      timestamp: timestamp,
    };

    // INSTANT: Add message to UI immediately (optimistic update)
    addOptimisticMessage(optimisticMessage as any);
    setNewMessage(""); // Clear input immediately for better UX

    // Update last read timestamp
    const lastReadKey = `chat_last_read_${user.username}`;
    localStorage.setItem(lastReadKey, timestamp);

    // BACKGROUND: Send to database (no need to update UI again, just sync)
    try {
      const { createData, SHEETS } = await import("@/services/api");

      const messageData = {
        sender: senderName,
        role: user.role,
        message: messageText,
        timestamp: timestamp,
      };

      const result = await createData(SHEETS.CHAT_MESSAGES, messageData);
      if (!result.success) {
        // Only remove optimistic message if failed
        removeOptimisticMessage(tempId);
        console.error("Failed to send message");
      }
      // On success: Don't remove or refetch - let background polling handle sync
      // This prevents the "blink" effect
    } catch (error) {
      // On error, remove optimistic message
      removeOptimisticMessage(tempId);
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed left-4 bottom-4 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-dark-100 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold">Chat Tim</span>
        </div>
        <button
          onClick={toggleChat}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="h-80 overflow-y-auto p-4 space-y-3 bg-dark-50"
      >
        {messages.length === 0 ? (
          <div className="text-center text-dark-400 py-8">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada pesan</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn =
              msg.sender ===
              (user?.namaLengkap || user?.nama || user?.username);
            return (
              <div
                key={msg.id || index}
                className={cn("flex", isOwn ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    isOwn
                      ? "bg-primary-500 text-white rounded-br-md"
                      : "bg-white text-dark-700 rounded-bl-md shadow-sm"
                  )}
                >
                  {/* Always show sender name and role */}
                  <p
                    className={cn(
                      "text-xs font-medium mb-1",
                      isOwn ? "text-white/90" : "text-primary-600"
                    )}
                  >
                    {msg.sender}
                    <span
                      className={cn(
                        "ml-1 font-normal capitalize",
                        isOwn ? "text-white/70" : "text-dark-400"
                      )}
                    >
                      ({msg.role})
                    </span>
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1",
                      isOwn ? "text-white/70" : "text-dark-400"
                    )}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-dark-100 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ketik pesan..."
            className="flex-1 px-4 py-2 bg-dark-50 border border-dark-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || loading}
            className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { sidebarCollapsed, darkMode } = useUIStore();
  const { isOpen: chatOpen } = useChatStore();

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-900 transition-colors duration-300">
      {/* Active Users Marquee - Fixed at top */}
      <div
        className={cn(
          "fixed top-0 right-0 z-40 transition-all duration-300",
          sidebarCollapsed ? "left-20" : "left-64"
        )}
      >
        <ActiveUsersMarquee />
      </div>

      <Sidebar />
      <Header />
      <main
        className={cn(
          "pt-24 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "pl-20" : "pl-64"
        )}
      >
        <div className="p-6">{children || <Outlet />}</div>
      </main>

      {/* Chat Panel */}
      <AnimatePresence>{chatOpen && <ChatPanel />}</AnimatePresence>
    </div>
  );
};

export default Layout;
