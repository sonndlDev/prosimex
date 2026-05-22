import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2, Hammer } from "lucide-react";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomeRedirect from "./components/HomeRedirect";

// Lazy-loaded pages — each page becomes a separate JS chunk
const LoginPage = React.lazy(() => import("./pages/auth/LoginPage"));
const UnauthorizedPage = React.lazy(() => import("./pages/auth/UnauthorizedPage"));
const DashboardPage = React.lazy(
  () => import("./pages/dashboard/DashboardPage"),
);
const FactoryPage = React.lazy(() => import("./pages/factories/FactoryPage"));
const MachinePage = React.lazy(() => import("./pages/machines/MachinePage"));
const OperationPage = React.lazy(
  () => import("./pages/operations/OperationPage"),
);
const ProductGroupPage = React.lazy(
  () => import("./pages/product-groups/ProductGroupPage"),
);
const ProductPage = React.lazy(() => import("./pages/products/ProductPage"));
const UserPage = React.lazy(() => import("./pages/auth/UserPage"));
const CustomerPage = React.lazy(() => import("./pages/customers/CustomerPage"));
const OrderPage = React.lazy(() => import("./pages/orders/OrderPage"));
const WarehousePage = React.lazy(() => import("./pages/warehouse/WarehousePage"));
const SuppliersPage = React.lazy(() => import("./pages/suppliers/SuppliersPage"));
const PlanningPage = React.lazy(() => import("./pages/planning/PlanningPage"));
const DailyTicketPage = React.lazy(() => import("./pages/daily-tickets/DailyTicketPage"));
const ApprovalTicketPage = React.lazy(() => import("./pages/daily-tickets/ApprovalTicketPage"));
const DailyTicketImportPage = React.lazy(() => import("./pages/import/DailyTicketImportPage"));
const ProductionOutputPage = React.lazy(() => import("./pages/daily-tickets/ProductionOutputPage"));
const PlanVsActualPage = React.lazy(() => import("./pages/daily-tickets/PlanVsActualPage"));
const OutsourcingPage = React.lazy(() => import("./pages/outsourcing/OutsourcingPage"));
const SchedulePage = React.lazy(() => import("./pages/schedule/SchedulePage"));
const ProductInventoryPage = React.lazy(() => import("./pages/inventory/ProductInventoryPage"));
const AttendancePage = React.lazy(
  () => import("./pages/attendance/AttendancePage"),
);
const AttendanceManagementPage = React.lazy(
  () => import("./pages/attendance/AttendanceManagementPage"),
);
const ProfilePage = React.lazy(() => import("./pages/auth/ProfilePage"));
const WorkerPage = React.lazy(() => import("./pages/workers/WorkerPage"));

// Loading fallback
const PageLoader = () => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-50/80 backdrop-blur-md transition-all duration-500">
    <div className="relative flex flex-col items-center">
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 blur-[60px] animate-pulse"></div>

      {/* Animated Logo Container */}
      <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.3)] animate-bounce-subtle">
        <Hammer className="w-10 h-10 text-white animate-pulse-gentle" />

        {/* Orbiting Spinner */}
        <div className="absolute -inset-2 border-2 border-transparent border-t-indigo-500/30 border-r-indigo-500/30 rounded-[32px] animate-spin-slow"></div>
      </div>

      {/* Loading Text */}
      <div className="mt-8 flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150">
        <h3 className="text-sm font-black text-zinc-800 uppercase tracking-[0.3em] pl-[0.3em] font-['Outfit']">
          PROSIMEX <span className="text-indigo-600">MES</span>
        </h3>
        <div className="flex items-center gap-2">
          <div className="h-[2px] w-8 bg-gradient-to-r from-transparent via-indigo-200 to-transparent"></div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Hệ thống đang tải...</p>
          <div className="h-[2px] w-8 bg-gradient-to-r from-indigo-200 via-indigo-200 to-transparent scale-x-[-1]"></div>
        </div>
      </div>
    </div>
  </div>
);

// Placeholder Pages for upcoming modules
const Placeholder = ({ title }) => (
  <h2 style={{ padding: "20px" }}>{title} Module - Coming Soon</h2>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route element={<ProtectedRoute requiredPermission="dashboard:read" />}>
                <Route path="/" element={<DashboardPage />} />
              </Route>

              {/* Modules protected by Role */}
              {/* Modules protected by Permissions */}
              <Route
                element={<ProtectedRoute requiredPermission="factories:read" />}
              >
                <Route path="/factories" element={<FactoryPage />} />
              </Route>
              <Route
                element={<ProtectedRoute requiredPermission="product_groups:read" />}
              >
                <Route path="/product-groups" element={<ProductGroupPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="products:read" />}>
                <Route path="/products" element={<ProductPage />} />
              </Route>
              <Route
                element={<ProtectedRoute requiredPermission="customers:read" />}
              >
                <Route path="/customers" element={<CustomerPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="suppliers:read" />}>
                <Route path="/suppliers" element={<SuppliersPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="orders:read" />}>
                <Route path="/orders" element={<OrderPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="warehouse:read" />}>
                <Route path="/warehouse" element={<WarehousePage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="planning:read" />}>
                <Route path="/planning" element={<PlanningPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="daily_tickets:read" />}>
                <Route path="/daily-tickets" element={<DailyTicketPage />} />
                <Route path="/daily-tickets/approval" element={<ApprovalTicketPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="production_output:read" />}>
                <Route path="/production-output" element={<ProductionOutputPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="import_excel:read" />}>
                <Route path="/import" element={<DailyTicketImportPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="plan_vs_actual:read" />}>
                <Route path="/plan-vs-actual" element={<PlanVsActualPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="outsourcing:read" />}>
                <Route path="/outsourcing" element={<OutsourcingPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="schedule:read" />}>
                <Route path="/schedule" element={<SchedulePage />} />
              </Route>
              <Route
                path="/product-inventory"
                element={<ProtectedRoute requiredPermission="product_inventory:read" />}
              >
                <Route index element={<ProductInventoryPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="machines:read" />}>
                <Route path="/machines" element={<MachinePage />} />
              </Route>
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/attendance"
                element={<ProtectedRoute requiredPermission="attendance:read" />}
              >
                <Route index element={<AttendancePage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute requiredPermission="attendance_management:read" />
                }
              >
                <Route
                  path="/attendance/management"
                  element={<AttendanceManagementPage />}
                />
              </Route>
              <Route
                element={<ProtectedRoute requiredPermission="operations:read" />}
              >
                <Route path="/operations" element={<OperationPage />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="users:read" />}>
                <Route path="/users" element={<UserPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="workers:read" />}>
                <Route path="/workers" element={<WorkerPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="settings:read" />}>
                <Route
                  path="/settings"
                  element={<Placeholder title="System Settings" />}
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
