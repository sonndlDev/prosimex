import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/dashboard/DashboardPage';
import FactoryPage from './pages/factories/FactoryPage';
import MachinePage from './pages/machines/MachinePage';
import OperationPage from './pages/operations/OperationPage';
import ProductGroupPage from './pages/product-groups/ProductGroupPage';
import ProductPage from './pages/products/ProductPage';
import UserPage from './pages/auth/UserPage';
import CustomerPage from './pages/customers/CustomerPage';
import OrderPage from './pages/orders/OrderPage';
import PlanningPage from './pages/planning/PlanningPage';
import SchedulePage from './pages/schedule/SchedulePage';

// Placeholder Pages for upcoming modules
const Placeholder = ({ title }) => <h2 style={{ padding: '20px' }}>{title} Module - Coming Soon</h2>;

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<h2 style={{ padding: '20px', color: 'red' }}>Unauthorized Access</h2>} />

                {/* Protected */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<DashboardPage />} />
                        
                        {/* Modules protected by Role */}
                        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PLANNER']} />}>
                            <Route path="/factories" element={<FactoryPage />} />
                            <Route path="/product-groups" element={<ProductGroupPage />} />
                            <Route path="/products" element={<ProductPage />} />
                            <Route path="/customers" element={<CustomerPage />} />
                            <Route path="/orders" element={<OrderPage />} />
                            <Route path="/planning" element={<PlanningPage />} />
                            <Route path="/schedule" element={<SchedulePage />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PLANNER', 'OPERATOR']} />}>
                            <Route path="/machines" element={<MachinePage />} />
                            <Route path="/operations" element={<OperationPage />} />
                        </Route>
                        
                        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                            <Route path="/users" element={<UserPage />} />
                            <Route path="/settings" element={<Placeholder title="System Settings" />} />
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
