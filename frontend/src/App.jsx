import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tickets from './pages/Tickets.jsx';
import MyTickets from './pages/MyTickets.jsx';
import CreateTicket from './pages/CreateTicket.jsx';
import TicketDetails from './pages/TicketDetails.jsx';
import TicketLogs from './pages/TicketLogs.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

import Users from './pages/admin/Users.jsx';
import Departments from './pages/admin/Departments.jsx';
import Groups from './pages/admin/Groups.jsx';
import Agents from './pages/admin/Agents.jsx';
import TicketTypes from './pages/admin/TicketTypes.jsx';
import EmployeeEmailMaster from './pages/admin/EmployeeEmailMaster.jsx';

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Route */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Application Layout */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/tickets/my" element={<MyTickets />} />
              <Route path="/tickets/create" element={<CreateTicket />} />
              <Route path="/tickets/logs" element={<TicketLogs />} />
              <Route path="/tickets/:id" element={<TicketDetails />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />

              {/* Admin Master Data Routes */}
              <Route
                path="/admin/employee-emails"
                element={
                  <AdminRoute>
                    <EmployeeEmailMaster />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <Users />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/departments"
                element={
                  <AdminRoute>
                    <Departments />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/groups"
                element={
                  <AdminRoute>
                    <Groups />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/agents"
                element={
                  <AdminRoute>
                    <Agents />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/ticket-types"
                element={
                  <AdminRoute>
                    <TicketTypes />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
