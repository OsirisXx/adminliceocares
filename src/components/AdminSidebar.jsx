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
import { useState } from "react";

const primaryItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, hash: "" },
  { to: "/admin#analytics", label: "Analytics", icon: BarChart3, hash: "#analytics" },
  { to: "/admin#concerns", label: "Manage concerns", icon: FileText, hash: "#concerns" },
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
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = (user?.email || "A").charAt(0).toUpperCase();
  const isActive = (item) => location.pathname === "/admin" && location.hash === item.hash;
  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-maroon-700/30 bg-maroon-800 text-white shadow-lg transition hover:bg-maroon-700 lg:hidden"
        aria-label="Open administrator navigation"
      >
        <Menu size={21} />
      </button>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="fixed left-4 top-4 z-40 hidden h-11 w-11 items-center justify-center rounded-xl border border-maroon-700/30 bg-maroon-800 text-white shadow-lg transition hover:bg-maroon-700 lg:inline-flex"
          aria-label="Open administrator sidebar"
          title="Open sidebar"
        >
          <ChevronRight size={21} />
        </button>
      )}

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-maroon-950/50 lg:hidden"
          aria-label="Close administrator navigation"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto border-r border-maroon-700 bg-maroon-800 text-white shadow-2xl transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:-translate-x-full" : "lg:translate-x-0"}`}
        aria-label="Administrator navigation"
      >
        <div className="border-b border-maroon-700/80 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <Link to="/admin" onClick={closeMobileMenu} className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500 shadow-lg shadow-maroon-950/20">
                <img src="/ldcu.ico" alt="LDCU" className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold tracking-tight">Liceo Cares</p>
                <p className="text-xs text-gold-300">Administrator workspace</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden rounded-lg p-2 text-maroon-100 transition hover:bg-maroon-700 lg:inline-flex"
              aria-label="Close administrator sidebar"
              title="Close sidebar"
            >
              <ChevronLeft size={19} />
            </button>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="rounded-lg p-2 text-maroon-100 transition hover:bg-maroon-700 lg:hidden"
              aria-label="Close administrator navigation"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-maroon-200">Workspace</p>
          <div className="space-y-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive(item)
                      ? "bg-gold-500 text-maroon-950 shadow-sm"
                      : "text-maroon-50 hover:bg-maroon-700 hover:text-white"
                  }`}
                >
                  <Icon size={19} strokeWidth={2.1} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <p className="px-3 pb-2 pt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-maroon-200">Tools</p>
          <Link
            to="/track"
            onClick={closeMobileMenu}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
              location.pathname === "/track"
                ? "bg-gold-500 text-maroon-950 shadow-sm"
                : "text-maroon-50 hover:bg-maroon-700 hover:text-white"
            }`}
          >
            <Search size={19} strokeWidth={2.1} />
            Track a concern
          </Link>
        </nav>

        <div className="border-t border-maroon-700/80 p-3">
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={onToggleNotifications}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-maroon-50 transition hover:bg-maroon-700"
            >
              <span className="relative">
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-maroon-950">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              Notifications
            </button>
            {showNotifications && (
              <div className="absolute bottom-full left-0 z-10 mb-3 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="font-semibold">Notifications</p>
                  <p className="text-xs text-gray-500">Latest activity requiring attention</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      <Bell size={22} className="mx-auto mb-2 text-gray-300" />
                      You are all caught up.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={`${notification.type}-${notification.id}`}
                        type="button"
                        onClick={() => onNotificationClick(notification.id, notification.type, notification.message)}
                        className="w-full border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-maroon-50"
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

          <div className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon-700 text-sm font-bold text-gold-300">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.email || "Administrator"}</p>
              <p className="flex items-center gap-1 text-xs text-maroon-200"><ShieldCheck size={13} /> Administrator</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-maroon-100 transition hover:bg-maroon-700 hover:text-white"
          >
            <LogOut size={19} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}