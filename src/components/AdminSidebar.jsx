import { Link } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

const adminPrimaryItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, hash: "" },
  { to: "/admin#analytics", label: "Analytics", icon: BarChart3, hash: "#analytics" },
  { to: "/admin#concerns", label: "Manage Feedback", icon: FileText, hash: "#concerns" },
];

const departmentPrimaryItems = [
  { to: "/department", label: "Overview", icon: LayoutDashboard, hash: "" },
  { to: "/department#analytics", label: "Analytics", icon: BarChart3, hash: "#analytics" },
  { to: "/department#concerns", label: "Manage Feedback", icon: FileText, hash: "#concerns" },
];

export function AdminSidebar({
  user,
  location,
  notifications,
  unreadCount,
  showNotifications,
  notificationRef,
  onToggleNotifications,
  onNotificationClick,
  formatNotificationTime,
  onSignOut,
  collapsed,
  onToggleCollapsed,
  userRole,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationPanelMounted, setNotificationPanelMounted] = useState(false);

  useEffect(() => {
    if (showNotifications) {
      setNotificationPanelMounted(true);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotificationPanelMounted(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [showNotifications]);
  const initials = (user?.email || "A").charAt(0).toUpperCase();
  const isDepartmentWorkspace = userRole !== "admin";
  const workspacePath = isDepartmentWorkspace ? "/department" : "/admin";
  const primaryItems = isDepartmentWorkspace ? departmentPrimaryItems : adminPrimaryItems;
  const workspaceSubtitle = isDepartmentWorkspace ? "Department workspace" : "Administrator workspace";
  const roleLabel = isDepartmentWorkspace ? "Department staff" : "Administrator";
  const isActive = (item) => location.pathname === workspacePath && location.hash === item.hash;
  const closeMobileMenu = () => setMobileOpen(false);
  const desktopLabelClass = collapsed ? "lg:hidden" : "";
  const desktopCenteredClass = collapsed ? "lg:justify-center lg:px-0" : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-maroon-800 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2 lg:hidden"
        aria-label="Open administrator navigation"
      >
        <Menu size={20} />
      </button>
      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="fixed left-4 top-4 z-40 hidden h-10 w-10 items-center justify-center rounded-lg bg-maroon-800 text-white shadow-md transition-colors hover:bg-maroon-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2 lg:inline-flex"
          aria-label="Open administrator sidebar"
          title="Open sidebar"
        >
          <ChevronRight size={19} />
        </button>
      )}

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-gray-950/40 lg:hidden"
          aria-label="Close administrator navigation"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white text-gray-700 shadow-sm transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:-translate-x-full" : "lg:translate-x-0"}`}
        aria-label="Administrator navigation"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-3">
          <Link
            to={workspacePath}
            onClick={closeMobileMenu}
            className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2"
            aria-label="Liceo Cares workspace"
            title="Liceo Cares"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-maroon-800">
              <img src="/ldcu.ico" alt="LDCU" className="h-6 w-6 object-contain" />
              <span className="absolute -bottom-0.5 h-1 w-3 rounded-full bg-gold-600" aria-hidden="true" />
            </span>
            <span className={`min-w-0 ${desktopLabelClass}`}>
              <span className="block truncate text-sm font-semibold tracking-tight text-gray-950">Liceo Cares</span>
              <span className="block truncate text-[11px] text-gray-500">{workspaceSubtitle}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-maroon-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2 lg:inline-flex ${collapsed ? "lg:hidden" : ""}`}
            aria-label="Collapse administrator sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-maroon-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2 lg:hidden"
            aria-label="Close administrator navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
          <p className={`px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 ${desktopLabelClass}`}>Workspace</p>
          <div className="space-y-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={closeMobileMenu}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive(item) ? "page" : undefined}
                  className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-1 ${desktopCenteredClass} ${
                    isActive(item)
                      ? "bg-maroon-800 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                  }`}
                >
                  <Icon size={18} strokeWidth={2} className="shrink-0" />
                  <span className={desktopLabelClass}>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <p className={`px-2 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 ${desktopLabelClass}`}>Tools</p>
          <Link
            to="/track"
            onClick={closeMobileMenu}
            title={collapsed ? "Track Feedback" : undefined}
            aria-current={location.pathname === "/track" ? "page" : undefined}
            className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-1 ${desktopCenteredClass} ${
              location.pathname === "/track"
                ? "bg-maroon-800 text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
            }`}
          >
            <Search size={18} strokeWidth={2} className="shrink-0" />
            <span className={desktopLabelClass}>Track Feedback</span>
          </Link>
        </nav>


        <div className="shrink-0 border-t border-gray-200 p-2">
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={onToggleNotifications}
              title={collapsed ? "Notifications" : undefined}
              aria-label={collapsed ? `Notifications, ${unreadCount} unread` : undefined}
              aria-expanded={showNotifications}
              className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-1 ${desktopCenteredClass}`}
            >
              <span className="relative shrink-0">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-600 px-1 text-[9px] font-bold text-maroon-950 ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className={desktopLabelClass}>Notifications</span>
            </button>
            {notificationPanelMounted && (
              <div className={`absolute bottom-full z-20 mb-2 w-[calc(100vw-2rem)] max-w-80 origin-bottom-left overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl ${showNotifications ? "animate-scaleIn" : "animate-notification-close"} ${collapsed ? "left-0 lg:left-[calc(100%+0.75rem)] lg:bottom-0 lg:mb-0" : "left-0"}`}>
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="mt-0.5 text-xs text-gray-500">Latest activity requiring attention</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      <Bell size={21} className="mx-auto mb-2 text-gray-300" />
                      You are all caught up.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={`${notification.type}-${notification.id}`}
                        type="button"
                        onClick={() => onNotificationClick(notification.id, notification.type, notification.message)}
                        className="w-full border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-maroon-700"
                      >
                        <p className="truncate text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-600">{notification.message}</p>
                        <p className="mt-1 text-xs text-gray-400">{formatNotificationTime(notification.time)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`mt-1 flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 ${desktopCenteredClass}`} title={collapsed ? user?.email || "Administrator" : undefined}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-maroon-50 text-xs font-bold text-maroon-800 ring-1 ring-inset ring-maroon-100">{initials}</div>
            <div className={`min-w-0 flex-1 ${desktopLabelClass}`}>
              <p className="truncate text-sm font-medium text-gray-900">{user?.email || "Administrator"}</p>
              <p className="flex items-center gap-1 text-[11px] text-gray-500"><ShieldCheck size={12} /> {roleLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            title={collapsed ? "Sign out" : undefined}
            aria-label={collapsed ? "Sign out" : undefined}
            className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-maroon-50 hover:text-maroon-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-1 ${desktopCenteredClass}`}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={desktopLabelClass}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}