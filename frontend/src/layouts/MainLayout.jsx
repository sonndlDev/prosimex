import React, { useState, useEffect, useCallback } from "react";
import AccessDeniedBanner from "../components/AccessDeniedBanner";
import NotificationDropdown from "../components/NotificationDropdown";
import CommandPalette from "../components/CommandPalette";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, Activity, ShoppingCart, CalendarDays, GanttChartSquare,
  ClipboardList, CheckSquare, ClipboardCheck, Package,
  Users, Wrench, Warehouse, Layers, Store,
  Tag, Factory, Settings, BarChart2, TrendingUp, FileSpreadsheet,
  Clock, Shield, LogOut, Menu, ChevronLeft, ChevronRight,
  Hammer, Search, Bell, Zap, Command
} from "lucide-react";
import { DateTime } from "luxon";
import { canShowMenu } from "../constants/permissions";

// ── Navigation Architecture ────────────────────────────────
const NAV = [
  {
    group: "OPERATIONS",
    items: [
      { text: "Tổng quan",          icon: LayoutDashboard, path: "/",                        permission: "dashboard" },
      { text: "Giám sát realtime",  icon: Activity,        path: "/monitor",                 permission: "dashboard" },
      { text: "Đơn hàng SX",        icon: ShoppingCart,    path: "/orders",                  permission: "orders" },
      { text: "Lập kế hoạch",       icon: CalendarDays,    path: "/planning",                permission: "planning" },
      { text: "Timeline",           icon: GanttChartSquare,path: "/schedule",                permission: "schedule" },
      { text: "Phiếu SX hàng ngày", icon: ClipboardList,   path: "/daily-tickets",           permission: "daily_tickets" },
      { text: "Duyệt phiếu SX",     icon: CheckSquare,     path: "/daily-tickets/approval",  permission: "daily_tickets" },
      { text: "Nhập sản lượng",     icon: ClipboardCheck,  path: "/production-output",       permission: "production_output" },
      { text: "Phiếu gia công",     icon: Package,         path: "/outsourcing",             permission: "outsourcing" },
    ],
  },
  {
    group: "RESOURCES",
    items: [
      { text: "Công nhân",          icon: Users,           path: "/workers",                 permission: "workers" },
      { text: "Máy móc",            icon: Wrench,          path: "/machines",                permission: "machines" },
      { text: "Thông tin Kho",      icon: Warehouse,       path: "/warehouse",               permission: "warehouse" },
      { text: "Tồn kho BTP & TP",   icon: Layers,          path: "/product-inventory",       permission: "product_inventory" },
      { text: "Nhà cung cấp",       icon: Store,           path: "/suppliers",               permission: "suppliers" },
    ],
  },
  {
    group: "MASTER DATA",
    items: [
      { text: "Mã hàng",            icon: Tag,             path: "/products",                permission: "products" },
      { text: "Nhóm mã hàng",       icon: Package,         path: "/product-groups",          permission: "product_groups" },
      { text: "Công đoạn",          icon: Settings,        path: "/operations",              permission: "operations" },
      { text: "Nhà máy",            icon: Factory,         path: "/factories",               permission: "factories" },
      { text: "Khách hàng",         icon: Store,           path: "/customers",               permission: "customers" },
      { text: "Import Excel",       icon: FileSpreadsheet, path: "/import",                  permission: "import_excel" },
    ],
  },
  {
    group: "ANALYTICS",
    items: [
      { text: "KH vs Thực tế",      icon: BarChart2,       path: "/plan-vs-actual",          permission: "plan_vs_actual" },
      { text: "Snapshot đơn hàng",  icon: TrendingUp,      path: "/orders/product-snapshots",permission: "orders" },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { text: "Chấm công",          icon: Clock,           path: "/attendance",              permission: "attendance" },
      { text: "QL Chấm công",       icon: Clock,           path: "/attendance/management",   permission: "attendance_management" },
      { text: "Người dùng & Quyền", icon: Shield,          path: "/users",                   permission: "users" },
    ],
  },
];

// ── Sidebar Content ────────────────────────────────────────
function SidebarContent({ collapsed, user, navigate, location, logout, allowedPaths, onOpenCmd }) {
  return (
    <div className="sidebar h-full flex flex-col" style={{ width: '100%' }}>

      {/* Brand */}
      <div
        className="flex items-center gap-2.5 flex-shrink-0"
        style={{
          height: 52,
          padding: collapsed ? '0 12px' : '0 16px',
          borderBottom: '1px solid rgb(var(--c-line))',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'rgb(var(--c-blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Hammer style={{ width: 13, height: 13, color: '#fff' }} strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--c-ink))', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Prosimex
            </div>
            <div style={{ fontSize: 9, color: 'rgb(var(--c-ink-4))', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              MES Platform
            </div>
          </div>
        )}
      </div>

      {/* Command palette trigger */}
      {!collapsed && (
        <div style={{ padding: '8px 8px 4px' }}>
          <button
            onClick={onOpenCmd}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              height: 30, padding: '0 10px', borderRadius: 6,
              background: 'rgb(var(--c-s2))', border: '1px solid rgb(var(--c-line-2))',
              color: 'rgb(var(--c-ink-4))', fontSize: 12, cursor: 'pointer',
              transition: 'all 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgb(var(--c-line-3))'; e.currentTarget.style.color = 'rgb(var(--c-ink-3))'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgb(var(--c-line-2))'; e.currentTarget.style.color = 'rgb(var(--c-ink-4))'; }}
          >
            <Search style={{ width: 12, height: 12 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>Tìm kiếm...</span>
            <span className="kbd">⌘K</span>
          </button>
        </div>
      )}
      {collapsed && (
        <div style={{ padding: '8px 8px 4px' }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenCmd}
                style={{
                  width: '100%', height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, background: 'rgb(var(--c-s2))', border: '1px solid rgb(var(--c-line-2))',
                  color: 'rgb(var(--c-ink-4))', cursor: 'pointer', transition: 'all 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgb(var(--c-blue))'; e.currentTarget.style.color = 'rgb(var(--c-blue))'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgb(var(--c-line-2))'; e.currentTarget.style.color = 'rgb(var(--c-ink-4))'; }}
              >
                <Search style={{ width: 12, height: 12 }} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Tìm kiếm (⌘K)</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {NAV.map((section) => {
          const visibleItems = section.items.filter(i => allowedPaths.has(i.path));
          if (!visibleItems.length) return null;
          return (
            <div key={section.group}>
              {!collapsed && <div className="nav-group-label">{section.group}</div>}
              {collapsed && <div style={{ height: 1, background: 'rgb(var(--c-line))', margin: '8px 4px' }} />}
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                const btn = (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn("nav-item", isActive && "active")}
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '7px' : '6px 10px' }}
                  >
                    <Icon style={{ width: 14, height: 14, flexShrink: 0 }} strokeWidth={isActive ? 2.2 : 1.8} />
                    {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>}
                  </button>
                );
                if (collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right">{item.text}</TooltipContent>
                    </Tooltip>
                  );
                }
                return btn;
              })}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgb(var(--c-line))', padding: '8px', flexShrink: 0 }}>
        <button
          onClick={() => navigate("/profile")}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: collapsed ? '7px' : '7px 8px',
            borderRadius: 6, cursor: 'pointer', background: 'none', border: 'none',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--c-s2))'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          className="group"
        >
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: 'rgb(var(--c-blue) / 0.15)',
            border: '1px solid rgb(var(--c-blue) / 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgb(var(--c-blue))' }}>
              {user?.username?.[0]?.toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'rgb(var(--c-ink))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name || user?.username}
                </div>
                <div style={{ fontSize: 10, color: 'rgb(var(--c-ink-4))' }}>{user?.role}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); logout(); }}
                style={{ padding: 4, borderRadius: 4, color: 'rgb(var(--c-ink-4))', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--c-crit))'; e.currentTarget.style.background = 'rgb(var(--c-crit-bg))'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-ink-4))'; e.currentTarget.style.background = 'none'; }}
                className="opacity-0 group-hover:opacity-100"
              >
                <LogOut style={{ width: 12, height: 12 }} />
              </button>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Live Clock ─────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(DateTime.now());
  useEffect(() => {
    const t = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="live-dot" />
      <span style={{ fontSize: 11, color: 'rgb(var(--c-ink-3))', fontVariantNumeric: 'tabular-nums' }}>
        {now.setLocale('vi-VN').toFormat('dd/MM/yyyy')}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgb(var(--c-ink-2))', fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
        {now.toFormat('HH:mm:ss')}
      </span>
    </div>
  );
}

// ── Main Layout ────────────────────────────────────────────
export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const queryClient = useQueryClient();

  // Global ⌘K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Socket.io for realtime notifications
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    const socket = io(import.meta.env.VITE_API_URL, { auth: { token } });
    socket.on('new_pending_ticket', (data) => {
      toast.info(data.message, {
        duration: 8000,
        action: { label: "Xem ngay", onClick: () => navigate("/daily-tickets/approval") },
      });
      queryClient.invalidateQueries(["daily-tickets"]);
      queryClient.invalidateQueries(["notifications"]);
    });
    return () => socket.disconnect();
  }, [user, navigate, queryClient]);

  const handleLogout = useCallback(() => { logout(); navigate("/login"); }, [logout, navigate]);

  const allowedPaths = new Set(
    NAV.flatMap(s => s.items).filter(i => canShowMenu(user, i.permission)).map(i => i.path)
  );

  // Build flat nav list for command palette
  const allNavItems = NAV.flatMap(s =>
    s.items.filter(i => allowedPaths.has(i.path)).map(i => ({ ...i, group: s.group }))
  );

  const currentItem = NAV.flatMap(s => s.items).find(i => i.path === location.pathname);
  const sidebarW = collapsed ? 50 : 220;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'rgb(var(--c-bg))', overflow: 'hidden', color: 'rgb(var(--c-ink))' }}>

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={allNavItems}
        onNavigate={(path) => { navigate(path); setCmdOpen(false); }}
      />

      {/* Desktop Sidebar */}
      <aside
        className="hidden sm:flex flex-col flex-shrink-0"
        style={{ width: sidebarW, transition: 'width 0.18s ease', overflow: 'hidden' }}
      >
        <SidebarContent
          collapsed={collapsed} user={user}
          navigate={navigate} location={location}
          logout={handleLogout} allowedPaths={allowedPaths}
          onOpenCmd={() => setCmdOpen(true)}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" style={{ padding: 0, width: 220, background: 'rgb(var(--c-bg))', border: 'none' }}>
          <SidebarContent
            collapsed={false} user={user}
            navigate={p => { navigate(p); setMobileOpen(false); }}
            location={location} logout={handleLogout} allowedPaths={allowedPaths}
            onOpenCmd={() => { setMobileOpen(false); setCmdOpen(true); }}
          />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header
          className="topbar"
          style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', gap: 12, position: 'sticky', top: 0, zIndex: 30 }}
        >
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(true)}
              className="sm:hidden"
              style={{ padding: 6, borderRadius: 5, color: 'rgb(var(--c-ink-3))', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Menu style={{ width: 15, height: 15 }} />
            </button>

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden sm:flex"
              style={{ padding: 6, borderRadius: 5, color: 'rgb(var(--c-ink-3))', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgb(var(--c-s2))'; e.currentTarget.style.color = 'rgb(var(--c-ink-2))'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgb(var(--c-ink-3))'; }}
            >
              {collapsed ? <ChevronRight style={{ width: 14, height: 14 }} /> : <ChevronLeft style={{ width: 14, height: 14 }} />}
            </button>

            <div style={{ width: 1, height: 14, background: 'rgb(var(--c-line-2))' }} className="hidden sm:block" />

            {/* Breadcrumb */}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgb(var(--c-ink-2))' }}>
              {currentItem?.text || "Hệ thống điều hành"}
            </span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Global search */}
            <button
              onClick={() => setCmdOpen(true)}
              className="global-search hidden md:flex"
            >
              <Search style={{ width: 13, height: 13 }} />
              <span style={{ fontSize: 12 }}>Tìm kiếm...</span>
              <span className="kbd" style={{ marginLeft: 'auto' }}>⌘K</span>
            </button>

            <div style={{ width: 1, height: 14, background: 'rgb(var(--c-line-2))' }} className="hidden md:block" />

            {/* Live clock */}
            <LiveClock />

            <div style={{ width: 1, height: 14, background: 'rgb(var(--c-line-2))' }} />

            {/* Notifications */}
            <NotificationDropdown />

            {/* Logout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  style={{ padding: 6, borderRadius: 5, color: 'rgb(var(--c-ink-3))', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--c-crit))'; e.currentTarget.style.background = 'rgb(var(--c-crit-bg))'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-ink-3))'; e.currentTarget.style.background = 'none'; }}
                >
                  <LogOut style={{ width: 14, height: 14 }} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Đăng xuất</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <AccessDeniedBanner />
    </div>
  );
}
