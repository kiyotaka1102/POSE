import { useState } from 'react';
import HomeLayout from './layouts/HomeLayout';
import DashboardHome from './pages/DashboardHome';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');

  return (
    <HomeLayout
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
    >
      <DashboardHome activeMenu={activeMenu} />
    </HomeLayout>
  );
}

export default App;