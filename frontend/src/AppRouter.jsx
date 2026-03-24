import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
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
const PlanningPage = React.lazy(() => import("./pages/planning/PlanningPage"));
const DailyTicketPage = React.lazy(() => import("./pages/daily-tickets/DailyTicketPage"));
const SchedulePage = React.lazy(() => import("./pages/schedule/SchedulePage"));
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
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    sx={{ height: "60vh" }}
  >
    <CircularProgress />
  </Box>
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
              <Route element={<ProtectedRoute requiredPermission="orders" />}>
                <Route path="/orders" element={<OrderPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="planning" />}>
                <Route path="/planning" element={<PlanningPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="planning" />}>
                <Route path="/daily-tickets" element={<DailyTicketPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="schedule" />}>
                <Route path="/schedule" element={<SchedulePage />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="machines" />}>
                <Route path="/machines" element={<MachinePage />} />
              </Route>
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                element={<ProtectedRoute requiredPermission="attendance" />}
              >
                <Route path="/attendance" element={<AttendancePage />} />
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
