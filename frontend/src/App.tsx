// App.tsx
import { useState } from 'react';
import HomeLayout from './layouts/HomeLayout';
import DashboardHome from './pages/DashboardHome';
import SurveillancePage from './pages/Surveillance';
// import TrackingPage from './pages/Tracking'; 
// import AnalyticsPage from './pages/AnalyticsPage'; 
// import InventoryPage from './pages/InventoryPage';
// import PeopleTrackingPage from './pages/PeopleTrackingPage';
// import ChatbotPage from './pages/ChatbotPage';
// import SettingsPage from './pages/SettingsPage';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');

  // Map menu key to actual page component
  const renderPage = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardHome activeMenu={activeMenu} />;
      case 'surveillance':
        return <SurveillancePage />;
      // case 'analytics':
      //   return <AnalyticsPage />;
      // case 'inventory':
      //   return <InventoryPage />;
      // case 'people':
      //   return <PeopleTrackingPage />;
      // case 'chatbot':
      //   return <ChatbotPage />;
      // case 'settings':
      //   return <SettingsPage />;
      default:
        return <DashboardHome activeMenu={activeMenu} />;
    }
  };

  return (
    <HomeLayout
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
    >
      {renderPage()}
    </HomeLayout>
  );
}

export default App;