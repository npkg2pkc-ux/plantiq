import { useState, useEffect, useRef } from "react";
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
  Check,
  CheckCheck,
} from "lucide-react";
import {
  cn,
  canViewSettings,
  canViewUsersPage,
  canViewRKAPPage,
  isViewOnly,
  formatDateTime,
} from "@/lib/utils";
import {
  useAuthStore,
  useUIStore,
  useNotificationStore,
  useChatStore,
} from "@/stores";
import { Badge, Button } from "@/components/ui";

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
    ],
  },
  {
    name: "Pengaturan",
    path: "/settings",
    icon: <Settings className="h-5 w-5" />,
    children: [
      { name: "Akun", path: "/settings/akun" },
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
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-dark-100 transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-dark-100">
        {!sidebarCollapsed && (
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/favicon.png" alt="PlantIQ Logo" className="h-9 w-9" />
            <span className="font-display font-bold text-dark-900">
              Plantiffy
            </span>
          </Link>
        )}
        <button
          onClick={toggleSidebarCollapse}
          className="p-2 text-dark-500 hover:bg-dark-100 rounded-lg transition-colors"
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
                      ? "bg-primary-50 text-primary-700"
                      : "text-dark-600 hover:bg-dark-50 hover:text-dark-900"
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
                                  ? "bg-primary-100 text-primary-700 font-medium"
                                  : "text-dark-500 hover:text-dark-900 hover:bg-dark-50"
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
                    ? "bg-primary-50 text-primary-700 shadow-sm"
                    : "text-dark-600 hover:bg-dark-50 hover:text-dark-900"
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
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    setNotifications,
  } = useNotificationStore();
  const { isOpen: chatOpen, toggleChat } = useChatStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Handle mark notification as read - also update backend
  const handleMarkAsRead = async (notifId: string) => {
    try {
      // Update local state first for instant feedback
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
      // Refresh every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, setNotifications]);

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
        "fixed top-0 right-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-dark-100 transition-all duration-300",
        sidebarCollapsed ? "left-20" : "left-64"
      )}
    >
      <div className="h-full px-6 flex items-center justify-between">
        {/* Mobile menu button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-dark-500 hover:bg-dark-100 rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search placeholder */}
        <div className="hidden md:block" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Chat */}
          <button
            onClick={toggleChat}
            className={cn(
              "p-2 rounded-lg transition-colors",
              chatOpen
                ? "bg-primary-100 text-primary-600"
                : "text-dark-500 hover:bg-dark-100"
            )}
          >
            <MessageCircle className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative p-2 rounded-lg transition-colors",
                showNotifications
                  ? "bg-primary-100 text-primary-600"
                  : "text-dark-500 hover:bg-dark-100"
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
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-dark-100 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-dark-100 flex items-center justify-between">
                    <h3 className="font-semibold text-dark-900">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-primary-600 hover:text-primary-700"
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
                            "px-4 py-3 border-b border-dark-50 cursor-pointer hover:bg-dark-50 transition-colors",
                            !notif.read && "bg-primary-50"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                                notif.read ? "bg-dark-300" : "bg-primary-500"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-dark-700 line-clamp-2">
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
              className="flex items-center gap-3 px-3 py-2 hover:bg-dark-50 rounded-xl transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-dark-900">
                  {user?.namaLengkap}
                </p>
                <p className="text-xs text-dark-500 capitalize">{user?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-dark-400" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-dark-100 py-2 z-50"
                >
                  <div className="px-4 py-2 border-b border-dark-100">
                    <p className="text-sm font-medium text-dark-900">
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
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
const ChatPanel = () => {
  const { user } = useAuthStore();
  const { messages, isOpen, toggleChat, addMessage, setMessages } =
    useChatStore();
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch messages when chat opens and auto-refresh every 3 seconds
  useEffect(() => {
    if (isOpen) {
      fetchMessages();
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

    setLoading(true);
    try {
      const { createData, SHEETS } = await import("@/services/api");
      const messageData = {
        sender: user.namaLengkap || user.nama || user.username,
        role: user.role,
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
      };

      const result = await createData(SHEETS.CHAT_MESSAGES, messageData);
      if (result.success && result.data) {
        addMessage(result.data as any);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
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
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-dark-50">
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
  const { sidebarCollapsed } = useUIStore();
  const { isOpen: chatOpen } = useChatStore();

  return (
    <div className="min-h-screen bg-dark-50">
      <Sidebar />
      <Header />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
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
