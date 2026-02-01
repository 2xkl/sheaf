import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout() {
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-(--color-bg)">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <div className="md:hidden h-14 bg-(--color-bg-sidebar) border-b border-(--color-border) flex items-center px-4 gap-3 sticky top-0 z-20">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-(--color-text-muted) hover:bg-(--color-bg-card) transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-(--color-primary)">sheaf</span>
        </h1>
      </div>

      <main className="md:ml-64 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
