import { Menu, X, Bell, Search } from 'lucide-react';

interface TopbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Topbar({ sidebarOpen, setSidebarOpen }: TopbarProps) {
  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-xl sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Toggle + Search */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-white/20 hover:shadow-lg group"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            ) : (
              <Menu className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            )}
          </button>

          {/* Search Bar */}
          <div className="relative hidden md:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search warehouse, cameras..."
              className="pl-10 pr-4 py-2 w-96 bg-white/10 border border-white/20 rounded-lg text-gray-400 placeholder-gray-400 backdrop-blur-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-white/40 
                         focus:bg-white/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* Right: Notifications + Status */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 rounded-lg transition-all duration-200 hover:bg-white/20 hover:shadow-lg group">
            <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </button>

          {/* System Status */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-lg border border-white/20 backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-400">All Systems Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}