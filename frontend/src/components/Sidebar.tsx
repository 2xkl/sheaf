import { NavLink } from 'react-router-dom';
import { FileText, Upload, LayoutDashboard, Users, BarChart3, LogOut, X, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-(--color-primary-light) text-(--color-primary)'
        : 'text-(--color-text-muted) hover:bg-(--color-bg-card) hover:text-(--color-text)'
    }`;

  const handleNavClick = () => {
    onClose();
  };

  const sidebar = (
    <aside className="w-64 h-screen bg-(--color-bg-sidebar) border-r border-(--color-border) flex flex-col">
      <div className="p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-(--color-primary)">sheaf</span>
          </h1>
          <p className="text-xs text-(--color-text-muted) mt-1">PDF hosting platform</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-(--color-text-muted) hover:bg-(--color-bg-card) transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <NavLink to="/dashboard" className={linkClass} onClick={handleNavClick}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        <NavLink to="/documents" className={linkClass} onClick={handleNavClick}>
          <FileText size={18} /> Documents
        </NavLink>
        <NavLink to="/upload" className={linkClass} onClick={handleNavClick}>
          <Upload size={18} /> Upload
        </NavLink>
        <NavLink to="/settings" className={linkClass} onClick={handleNavClick}>
          <Settings size={18} /> Settings
        </NavLink>

        {user?.is_admin && (
          <>
            <div className="pt-4 pb-2 px-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
                Admin
              </span>
            </div>
            <NavLink to="/admin/users" className={linkClass} onClick={handleNavClick}>
              <Users size={18} /> Users
            </NavLink>
            <NavLink to="/admin/stats" className={linkClass} onClick={handleNavClick}>
              <BarChart3 size={18} /> Statistics
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-(--color-border) space-y-3">
        <ThemeSwitcher />
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-(--color-text-muted)">
              {user?.is_admin ? 'Admin' : 'User'}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-(--color-text-muted) hover:text-(--color-danger) hover:bg-(--color-bg-card) transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: fixed sidebar, always visible */}
      <div className="hidden md:block fixed left-0 top-0 z-30">
        {sidebar}
      </div>

      {/* Mobile: overlay sidebar */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="relative z-50 animate-slide-in">
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}
