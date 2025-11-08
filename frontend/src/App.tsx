import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import DashboardHome from './components/dashboard/DashboardHome';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        <DashboardHome activeMenu={activeMenu} />
      </div>
    </div>
  );
}

export default App;