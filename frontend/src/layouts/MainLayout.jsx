import React, { useState } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, Factory, Settings, CalendarDays, Users, LogOut,
  Package, Tag, Store, ShoppingCart, GanttChartSquare, Wrench,
  Clock, ClipboardList, ClipboardCheck, Menu, ChevronLeft, ChevronRight,
  Hammer, UserCircle, Warehouse, Calendar, Layers,
  BarChart2
} from "lucide-react";
import { DateTime } from "luxon";

const menuItems = [
  { type: "subheader", text: "Sản xuất" },
  { text: "Bảng điều khiển", icon: LayoutDashboard, path: "/", permission: "dashboard" },
  { text: "Đơn hàng", icon: ShoppingCart, path: "/orders", permission: "orders" },
  { text: "Lập kế hoạch", icon: CalendarDays, path: "/planning", permission: "planning" },
  { text: "Timeline", icon: GanttChartSquare, path: "/schedule", permission: "schedule" },
  { text: "Phiếu SX hàng ngày", icon: ClipboardList, path: "/daily-tickets", permission: "daily_tickets" },
  { text: "Nhập sản lượng", icon: ClipboardCheck, path: "/production-output", permission: "production_output" },
  { text: "Phiếu gia công ", icon: Package, path: "/outsourcing", permission: "outsourcing" },
  { text: "Thông tin Kho", icon: Warehouse, path: "/warehouse", permission: "warehouse" },
  { text: "Tồn kho BTP & TP", icon: Layers, path: "/product-inventory", permission: "product_inventory" },
  { text: "Báo cáo KH vs TT", icon: BarChart2, path: "/plan-vs-actual", permission: "daily_tickets_plan" },

  { type: "subheader", text: "Dữ liệu gốc" },
  { text: "Khách hàng", icon: Store, path: "/customers", permission: "customers" },
  { text: "Nhà cung cấp", icon: Store, path: "/suppliers", permission: "suppliers" },
  { text: "Nhà máy", icon: Factory, path: "/factories", permission: "factories" },
  { text: "Máy móc", icon: Wrench, path: "/machines", permission: "machines" },
  { text: "Nhóm mã hàng", icon: Tag, path: "/product-groups", permission: "product_groups" },
  { text: "Mã hàng", icon: Package, path: "/products", permission: "products" },
  { text: "Công đoạn", icon: Settings, path: "/operations", permission: "operations" },
  { type: "subheader", text: "Hệ thống" },
  { text: "Chấm công", icon: Clock, path: "/attendance", permission: "attendance" },
  { text: "Quản lý chấm công", icon: Clock, path: "/attendance/management", permission: "attendance_management" },
  { text: "Quản lý công nhân", icon: Users, path: "/workers", permission: "workers" },
  { text: "Người dùng & Quyền", icon: Users, path: "/users", permission: "users" },
  { text: "Cài đặt hệ thống", icon: Settings, path: "/settings", permission: "settings" },
];

function SidebarContent({ isCollapsed, user, allowedMenus, navigate, location, handleLogout }) {
  return (
    <div className="h-full flex flex-col glass-sidebar transition-all duration-300">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 p-4 h-[72px] border-b border-slate-200/50 relative overflow-hidden", isCollapsed ? "justify-center" : "")}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 pointer-events-none"></div>
        <div className="w-9 h-9 bg-gradient-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 relative z-10">
          <Hammer className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <span className="font-extrabold text-slate-800 tracking-tight text-xl leading-none relative z-10 font-['Outfit']">
            PROSIMEX
          </span>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {allowedMenus.map((item, index) => {
          if (item.type === "subheader") {
            return !isCollapsed ? (
              <p key={index} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-2 pt-4 pb-1">
                {item.text}
              </p>
            ) : (
              <Separator key={index} className="my-2" />
            );
          }
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const btn = (
            <div
              role="button"
              tabIndex={0}
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-300 relative group overflow-hidden cursor-pointer outline-none",
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-600 hover:bg-primary/10 hover:text-primary",
                isCollapsed ? "justify-center" : ""
              )}
            >
              {isActive && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-md"></span>
              )}
              <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform duration-300", !isActive && "group-hover:scale-110")} />
              {!isCollapsed && <span className="transition-transform duration-300 group-hover:translate-x-1">{item.text}</span>}
            </div>
          );
          if (isCollapsed) {
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger className="block w-full">{btn}</TooltipTrigger>
                <TooltipContent side="right"><p>{item.text}</p></TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </div>

      {/* User info */}
      <div className="p-4 border-t border-slate-200/50 bg-slate-50/30">
        <div
          onClick={() => navigate("/profile")}
          className={cn(
            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white hover:shadow-sm transition-all duration-300 border border-transparent hover:border-slate-200/60",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <Avatar className="w-9 h-9 flex-shrink-0 bg-gradient-to-tr from-primary to-indigo-400 shadow-sm">
            <AvatarFallback className="bg-transparent text-white text-sm font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.username}</p>
              <Badge variant="secondary" className="bg-white text-primary border-primary/20 text-[10px] h-4.5 px-2 font-semibold mt-0.5 shadow-sm">
                {user?.role}
              </Badge>
            </div>
          )}
          {!isCollapsed && (
            <Tooltip>
              <TooltipTrigger>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer outline-none"
                >
                  <LogOut className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent><p>Đăng xuất</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(DateTime.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-900/5 rounded-2xl border border-slate-200/50 shadow-sm backdrop-blur-sm group hover:bg-slate-900 transition-all duration-500 cursor-default">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">
          {now.setLocale('vi-VN').toFormat('cccc')}
        </span>
        <span className="text-[13px] font-black text-slate-700 group-hover:text-white transition-colors tabular-nums">
          {now.setLocale('vi-VN').toFormat('dd/MM/yyyy')}
        </span>
      </div>
      <div className="w-px h-6 bg-slate-200 group-hover:bg-slate-700 transition-colors"></div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        <span className="text-xl font-black text-slate-900 group-hover:text-emerald-400 transition-all duration-500 tabular-nums font-mono tracking-tighter">
          {now.toFormat('HH:mm:ss')}
        </span>
      </div>
    </div>
  );
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  const allowedMenus = menuItems.filter((item, index) => {
    if (item.type === "subheader") {
      const nextItems = menuItems.slice(index + 1);
      const firstSubheader = nextItems.findIndex((i) => i.type === "subheader");
      const itemsInSection = firstSubheader === -1 ? nextItems : nextItems.slice(0, firstSubheader);
      return itemsInSection.some((i) => {
        if (user?.role === "ADMIN") return true;
        if (user?.permissions) return user.permissions.includes(i.permission);
        return false;
      });
    }
    if (user?.role === "ADMIN") return true;
    if (user?.permissions) return user.permissions.includes(item.permission);
    return false;
  });

  const sidebarWidth = isCollapsed ? 72 : 260;
  const currentPage = allowedMenus.find((m) => m.path === location.pathname);

  return (
    <div className="flex h-screen bg-[#f8fafc] font-['Inter',sans-serif] selection:bg-primary/20 selection:text-primary">
      {/* Desktop Sidebar */}
      <aside
        className="hidden sm:flex flex-col flex-shrink-0 transition-all duration-200 ease-in-out"
        style={{ width: sidebarWidth }}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          user={user}
          allowedMenus={allowedMenus}
          navigate={navigate}
          location={location}
          handleLogout={handleLogout}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[260px]">
          <SidebarContent
            isCollapsed={false}
            user={user}
            allowedMenus={allowedMenus}
            navigate={(path) => { navigate(path); setMobileOpen(false); }}
            location={location}
            handleLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="h-[72px] glass-panel border-b border-slate-200/50 flex items-center justify-between px-6 gap-4 sticky top-0 z-20 transition-all duration-300">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="sm:hidden p-2.5 rounded-xl text-slate-500 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Desktop collapse */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden sm:flex p-2.5 rounded-xl text-slate-500 hover:bg-primary/10 hover:text-primary transition-all duration-300"
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
            <h1 className="font-bold text-slate-800 text-lg tracking-tight font-['Outfit'] truncate max-w-[200px]">
              {currentPage?.text || "Hệ thống điều hành"}
            </h1>
          </div>


          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <LiveClock />
            </div>
            <Tooltip>
              <TooltipTrigger>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleLogout}
                  className="p-2 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer outline-none"
                >
                  <LogOut className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent><p>Đăng xuất</p></TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>
          <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
