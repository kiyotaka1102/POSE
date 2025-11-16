import type { ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

interface HomeLayoutProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  children: ReactNode;
}

export default function HomeLayout({
  sidebarOpen,
  setSidebarOpen,
  activeMenu,
  setActiveMenu,
  children,
}: HomeLayoutProps) {
  return (
    <div className="flex h-screen w-screen bg-linear-to-br from-blue-200 via-cyan-50 to-blue-300">
      <Sidebar
        sidebarOpen={sidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        {children}
      </div>
    </div>
  );
}
