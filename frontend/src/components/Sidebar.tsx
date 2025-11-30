import { useState, useRef, useEffect } from 'react';
import { 
  Home, Camera, Users, Package, BarChart3, Settings, 
  LogOut, User, ChevronDown 
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import type { User as UserType } from '../services/authService';

interface MenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onLogout: () => void;
  currentUser: UserType | null;
}

// Helper function to get user initials
function getInitials(fullName: string): string {
  const names = fullName.trim().split(/\s+/);
  if (names.length >= 2) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  return fullName.substring(0, 2).toUpperCase();
}

export default function Sidebar({ sidebarOpen, activeMenu, setActiveMenu, onLogout, currentUser }: SidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'surveillance', icon: Camera, label: 'Surveillance' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
    { id: 'people', icon: Users, label: 'People Tracking' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className={`${
      sidebarOpen ? 'w-72' : 'w-0'
    } bg-white/8 backdrop-blur-xl border-r border-white/15 text-gray-800 transition-all duration-300 ease-in-out flex flex-col shadow-2xl overflow-hidden sticky top-0 h-screen`}>
      
      {/* Logo & Navigation - giữ nguyên */}
      <div className={`p-6 border-b border-white/15 ${sidebarOpen ? '' : 'hidden'}`}>
        {/* ... logo như cũ */}
        {sidebarOpen ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg">
              <span className="font-bold text-white text-xl">WV</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-800 truncate">WareVision</h3>
              <p className="text-sm text-gray-600 truncate">Smart Monitoring</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="font-bold text-white text-xl">WV</span>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50 scale-105'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-white/10 hover:scale-102'
              } ${!sidebarOpen ? 'justify-center px-3' : ''}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-800'}`} />
              {sidebarOpen && (
                <span className={`${isActive ? 'text-white' : 'text-gray-600'} text-sm font-medium flex-1 text-left`}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* === PHẦN USER PROFILE + DROPDOWN === */}
      <div className={`p-4 border-t border-white/15 bg-white/5 backdrop-blur-sm ${sidebarOpen ? '' : 'hidden'}`} ref={dropdownRef}>
        <div className="relative">
          {/* Nút chính - click để mở dropdown */}
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
              {currentUser ? getInitials(currentUser.fullName) : 'U'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {currentUser?.fullName || 'User'}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {currentUser?.emailAddress || 'No email'}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {profileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-transparent rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                onClick={() => {
                  setActiveMenu('settings'); 
                  setProfileOpen(false);
                  // setActiveMenu('profile'); 
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
              >
                <User className="w-4 h-4 text-gray-700" />
                <span className="text-sm text-gray-700 font-medium">View Profile</span>
              </button>
              <hr className="border-gray-200" />
              <button
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-700" />
                <span className="text-sm text-red-700 font-medium">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}