import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2, Hammer } from "lucide-react";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-loaded pages — each page becomes a separate JS chunk
const LoginPage = React.lazy(() => import("./pages/auth/LoginPage"));
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
const ProductionOutputPage = React.lazy(() => import("./pages/daily-tickets/ProductionOutputPage"));
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
          <Route
            path="/unauthorized"
            element={
              <h2 style={{ padding: "20px", color: "red" }}>
                Unauthorized Access
              </h2>
            }
          />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />

              {/* Modules protected by Role */}
              {/* Modules protected by Permissions */}
              <Route
                element={<ProtectedRoute requiredPermission="factories" />}
              >
                <Route path="/factories" element={<FactoryPage />} />
              </Route>
              <Route
                element={<ProtectedRoute requiredPermission="product_groups" />}
              >
                <Route path="/product-groups" element={<ProductGroupPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="products" />}>
                <Route path="/products" element={<ProductPage />} />
              </Route>
              <Route
                element={<ProtectedRoute requiredPermission="customers" />}
              >
                <Route path="/customers" element={<CustomerPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="suppliers" />}>
                <Route path="/suppliers" element={<SuppliersPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="orders" />}>
                <Route path="/orders" element={<OrderPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="warehouse" />}>
                <Route path="/warehouse" element={<WarehousePage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="planning" />}>
                <Route path="/planning" element={<PlanningPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="daily_tickets" />}>
                <Route path="/daily-tickets" element={<DailyTicketPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="production_output" />}>
                <Route path="/production-output" element={<ProductionOutputPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="outsourcing" />}>
                <Route path="/outsourcing" element={<OutsourcingPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="schedule" />}>
                <Route path="/schedule" element={<SchedulePage />} />
              </Route>
              <Route
                path="/product-inventory"
                element={<ProtectedRoute requiredPermission="product_inventory" />}
              >
                <Route index element={<ProductInventoryPage />} />
              </Route>

              <Route
                path="/attendance"
                element={<ProtectedRoute requiredPermission="attendance" />}
              >
                <Route index element={<AttendancePage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute requiredPermission="attendance_management" />
                }
              >
                <Route
                  path="/attendance/management"
                  element={<AttendanceManagementPage />}
                />
              </Route>
              <Route
                element={<ProtectedRoute requiredPermission="operations" />}
              >
                <Route path="/operations" element={<OperationPage />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="users" />}>
                <Route path="/users" element={<UserPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="workers" />}>
                <Route path="/workers" element={<WorkerPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="settings" />}>
                <Route
                  path="/settings"
                  element={<Placeholder title="System Settings" />}
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
