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
        sidebarOpen ? 'w-72' : 'w-0'
      } bg-white/8 backdrop-blur-xl border-r border-white/15 text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl overflow-hidden sticky top-0 h-screen`}
    >
        {/* Logo */}
        <div className={`p-6 border-white/15 border-b ${sidebarOpen ? '' : 'hidden'}`}>
        {sidebarOpen ? (
            <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-sm">
                <span className="text-gray-600 font-bold text-xl">WV</span>
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-600 truncate">WareVision</h3>
                <p className="text-xs text-gray-600 truncate">Smart Monitoring</p>
            </div>
            </div>
        ) : (
            <div className="w-9 h-9 bg-cyan-500/90 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-sm">
            <span className="text-gray-400 font-bold text-lg">WV</span>
            </div>
        )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
            {menuItems.map((item) => {
            const Icon = item.icon;
            return (
                <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeMenu === item.id
                    ? 'bg-cyan-500/90 text-white shadow-lg shadow-cyan-500/40 scale-105'
                    : 'text-gray-400 hover:bg-white/15 hover:text-white hover:scale-102'
                } ${!sidebarOpen ? 'justify-center' : ''}`}
                >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && (
                    <span className="text-sm font-medium flex-1 text-left transition-opacity duration-300">{item.label}</span>
                )}
                </button>
            );
            })}
        </nav>

        {/* User Profile */}
        <div className={`p-4 border-t border-white/15 bg-white/5 backdrop-blur-sm ${sidebarOpen ? '' : 'hidden'}`}>
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-sm font-bold shrink-0">
                AD
            </div>
            {sidebarOpen && (
                <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin User</p>
                <p className="text-xs text-white/50 truncate">admin@warehouse.com</p>
                </div>
            )}
            </div>
        </div>
    </aside>
  );
}