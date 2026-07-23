import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Home,
  Search,
  LogOut,
  Shield,
  Building2,
  Menu,
  X,
  Bell,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { TICKET_OPENED_EVENT } from "../lib/notificationEvents";
import { AdminSidebar } from "./AdminSidebar.jsx";

const Layout = ({ children }) => {
  const { user, userRole, userDepartment, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const publicLinks = user
    ? []
    : [
      { path: "/track", label: "Track Status", icon: Search },
    ];

  const superAdminLinks = [
    { path: "/super-admin", label: "Super Admin", icon: Shield },
  ];

  const adminLinks = [
    { path: "/admin", label: "Admin Dashboard", icon: Shield },
  ];

  const departmentLinks = [
    { path: "/department", label: "Department Dashboard", icon: Building2 },
  ];

  const fetchNotifications = async () => {
    if (!user || !userRole) return;

    try {
      let notifs = [];

      // Fetch from system_notifications (RLS bypassed using bulletproof RPC)
      const { data: sysNotifs, error: sysError } = await supabase
        .rpc("get_my_notifications");

      if (sysError) {
        console.error("Error fetching system notifications:", sysError);
      } else if (sysNotifs) {
        notifs = sysNotifs.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          time: n.created_at,
          read: n.is_read,
          reference_id: n.reference_id
        }));
      }

      // For super_admin, we still append today's audit logs as virtual notifications
      if (userRole === "super_admin") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: auditData } = await supabase
          .from("system_audit_log")
          .select("*")
          .gte("created_at", today.toISOString())
          .order("created_at", { ascending: false })
          .limit(10);

        if (auditData) {
          const auditNotifs = auditData.map((a) => ({
            id: a.id,
            type: "audit",
            title: a.action,
            message: a.actor_email || "System",
            time: a.created_at,
            read: false,
          }));
          notifs = [...notifs, ...auditNotifs].sort((a, b) => new Date(b.time) - new Date(a.time));
        }
      }

      setNotifications(notifs);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleNotificationClick = async (notificationId, type, message) => {
    // Optimistically mark as read and update state
    handleMarkAsRead(notificationId, type);
    
    // Extract reference number and navigate
    if (type !== 'audit' && message) {
      const match = message.match(/LDCU-[A-Z0-9]+-[A-Z0-9]+/);
      if (match) {
        navigate(`/ticket/${match[0]}`);
      }
    }
  };

  const handleMarkAsRead = async (notificationId, type) => {
    // Audit logs are virtual and cannot be marked as read in the DB
    if (type === 'audit') return;

    try {
      // Optimistically remove the notification from the open list.
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      const { error } = await supabase
        .from('system_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        // If it fails, fetch again to restore state
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error in handleMarkAsRead:', err);
    }
  };

  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    if (user && userRole) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, userRole, userDepartment]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter((notification) => !notification.read).length);
  }, [notifications]);

  useEffect(() => {
    const handleTicketOpened = async (event) => {
      const complaintId = event.detail?.complaintId;
      if (!complaintId) return;

      let { error } = await supabase.rpc('mark_my_ticket_notifications_read', {
        ticket_id: complaintId,
      });

      // Keep existing deployments working until the new RPC migration is applied.
      if (error) {
        const fallback = await supabase
          .from('system_notifications')
          .update({ is_read: true })
          .eq('reference_id', complaintId)
          .eq('is_read', false);
        error = fallback.error;
      }

      if (error) {
        console.error('Error marking ticket notifications as read:', error);
        return;
      }

      setNotifications((previous) =>
        previous.filter(
          (notification) => String(notification.reference_id) !== String(complaintId)
        )
      );
    };

    window.addEventListener(TICKET_OPENED_EVENT, handleTicketOpened);
    return () => window.removeEventListener(TICKET_OPENED_EVENT, handleTicketOpened);
  }, []);

  const isStaffWorkspace =
    ["admin", "department", "faculty", "employee"].includes(userRole) &&
    (location.pathname === "/admin" ||
      location.pathname === "/department" ||
      location.pathname === "/track" ||
      location.pathname.startsWith("/ticket/"));

  if (isStaffWorkspace) {
    return (
      <div className="min-h-screen bg-[#f8f8f7]">
        <AdminSidebar
          user={user}
          location={location}
          notifications={notifications}
          unreadCount={unreadCount}
          showNotifications={showNotifications}
          notificationRef={notificationRef}
          onToggleNotifications={() => setShowNotifications((isOpen) => !isOpen)}
          onNotificationClick={handleNotificationClick}
          formatNotificationTime={formatNotificationTime}
          onSignOut={handleSignOut}
          collapsed={adminSidebarCollapsed}
          userRole={userRole}
          onToggleCollapsed={() => setAdminSidebarCollapsed((isCollapsed) => !isCollapsed)}
        />
        <main
          className={`min-h-screen min-w-0 pt-16 transition-[padding] duration-300 lg:pt-0 ${
            adminSidebarCollapsed ? "lg:pl-0" : "lg:pl-64"
          }`}
        >
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-maroon-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center">
                <img src="/ldcu.ico" alt="LDCU Logo" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold">Liceo Cares</h1>
                <p className="text-xs text-gold-300">
                  Feedback Management System
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {publicLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive(path)
                      ? "bg-gold-500 text-maroon-800 font-semibold"
                      : "hover:bg-maroon-700 text-white"
                    }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}

              {user &&
                userRole === "super_admin" &&
                superAdminLinks.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive(path)
                        ? "bg-gold-500 text-maroon-800 font-semibold"
                        : "hover:bg-maroon-700 text-white"
                      }`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                ))}

              {user &&
                userRole === "admin" &&
                adminLinks.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive(path)
                        ? "bg-gold-500 text-maroon-800 font-semibold"
                        : "hover:bg-maroon-700 text-white"
                      }`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                ))}

              {user &&
                userRole === "department" &&
                departmentLinks.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive(path)
                        ? "bg-gold-500 text-maroon-800 font-semibold"
                        : "hover:bg-maroon-700 text-white"
                      }`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                ))}

              {user && (
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-lg hover:bg-maroon-700 transition-all duration-200"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-maroon-800 text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">
                          Notifications
                        </h3>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500">
                            <Bell
                              size={24}
                              className="mx-auto mb-2 text-gray-300"
                            />
                            <p className="text-sm">No notifications</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif.id, notif.type, notif.message)}
                              className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group relative"
                            >
                              <div className="flex justify-between items-start">
                                <p className="font-medium text-gray-900 text-sm">
                                  {notif.title}
                                </p>
                                {notif.type !== 'audit' && (
                                  <span className="text-xs text-maroon-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2">
                                    Mark read
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 text-xs truncate">
                                {notif.message}
                              </p>
                              <p className="text-gray-400 text-xs mt-1">
                                {formatNotificationTime(notif.time)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {user ? (
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-maroon-700 transition-all duration-200"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive("/login")
                      ? "bg-gold-500 text-maroon-800 font-semibold"
                      : "hover:bg-maroon-700 text-white border border-gold-500"
                    }`}
                >
                  <span>Staff Login</span>
                </Link>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-maroon-700 transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-maroon-900 border-t border-maroon-700">
            <nav className="px-4 py-3 space-y-1">
              {publicLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive(path)
                      ? "bg-gold-500 text-maroon-800 font-semibold"
                      : "hover:bg-maroon-700 text-white"
                    }`}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}

              {user &&
                userRole === "super_admin" &&
                superAdminLinks.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive(path)
                        ? "bg-gold-500 text-maroon-800 font-semibold"
                        : "hover:bg-maroon-700 text-white"
                      }`}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </Link>
                ))}

              {user &&
                userRole === "admin" &&
                adminLinks.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive(path)
                        ? "bg-gold-500 text-maroon-800 font-semibold"
                        : "hover:bg-maroon-700 text-white"
                      }`}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </Link>
                ))}

              {user &&
                userRole === "department" &&
                departmentLinks.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive(path)
                        ? "bg-gold-500 text-maroon-800 font-semibold"
                        : "hover:bg-maroon-700 text-white"
                      }`}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </Link>
                ))}

              {user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-maroon-700 transition-all duration-200 w-full text-left"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-maroon-700 transition-all duration-200 border border-gold-500"
                >
                  <span>Staff Login</span>
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-maroon-900 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                <img src="/ldcu.ico" alt="LDCU Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-semibold">Liceo de Cagayan University</p>
                <p className="text-sm text-gray-400">
                  Feedback Management System
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Â© {new Date().getFullYear()} Liceo Cares. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
