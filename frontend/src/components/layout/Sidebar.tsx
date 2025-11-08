import React from 'react';
import { Home, Camera, Users, Package, BarChart3, Settings, MessageSquare } from 'lucide-react';
import {type LucideIcon} from 'lucide-react';

interface MenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export default function Sidebar({ sidebarOpen, activeMenu, setActiveMenu }: SidebarProps) {
  const menuItems: MenuItem[] = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'surveillance', icon: Camera, label: 'Surveillance' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
    { id: 'people', icon: Users, label: 'People Tracking' },
    { id: 'chatbot', icon: MessageSquare, label: 'AI Assistant' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-72' : 'w-18'
      } bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl`}
    >
        {/* Logo */}
        <div className={`p-6 border-slate-700/40 ${!sidebarOpen ? 'flex justify-center' : ''}`}>
        {sidebarOpen ? (
            <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">WV</span>
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white truncate">WareVision</h3>
                <p className="text-xs text-slate-400 truncate">Smart Monitoring</p>
            </div>
            </div>
        ) : (
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">WV</span>
            </div>
        )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
            const Icon = item.icon;
            return (
                <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeMenu === item.id
                    ? 'bg-blue-600 shadow-lg shadow-blue-600/50'
                    : 'hover:bg-slate-700/50'
                } ${!sidebarOpen ? 'justify-center' : ''}`}
                >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                    <span className="text-sm font-medium">{item.label}</span>
                )}
                </button>
            );
            })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                AD
            </div>
            {sidebarOpen && (
                <div className="flex-1">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-slate-400">admin@warehouse.com</p>
                </div>
            )}
            </div>
        </div>
    </aside>
  );
}