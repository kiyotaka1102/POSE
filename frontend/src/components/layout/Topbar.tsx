import React from 'react';
import { Menu, X, Bell, Search } from 'lucide-react';

interface TopbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Topbar({ sidebarOpen, setSidebarOpen }: TopbarProps) {
  return (
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur-md border-b border-slate-700 shadow-lg">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Toggle + Search */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-slate-700/70 hover:shadow-md"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-slate-300" />
            ) : (
              <Menu className="w-5 h-5 text-slate-300" />
            )}
          </button>

          {/* Search Bar */}
          <div className="relative hidden md:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search warehouse, cameras..."
              className="pl-10 pr-4 py-2 w-96 bg-slate-700/40 border border-slate-600 rounded-lg text-white placeholder-slate-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                         focus:bg-slate-700/60 transition-all duration-200"
            />
          </div>
        </div>

        {/* Right: Notifications + Status */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 rounded-lg transition-all duration-200 hover:bg-slate-700/70 hover:shadow-md group">
            <Bell className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </button>

          {/* System Status */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-900/30 rounded-lg border border-green-700/50 backdrop-blur-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-400">All Systems Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}