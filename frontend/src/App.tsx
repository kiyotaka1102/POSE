import { useState } from 'react';
import HomeLayout from './layouts/HomeLayout';
import SurveillancePage from './pages/Surveillance';
import ComingSoon from './pages/ComingSoon';
import LoginPage from './pages/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<string>('surveillance'); 

  const handleLogin = (email: string, password: string) => {
    console.log('Login with:', email, password);
    setIsAuthenticated(true);
    setActiveMenu('surveillance'); 
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveMenu('surveillance');
    setSidebarOpen(true);
  };

  const renderPage = () => {
    if (activeMenu === 'surveillance') {
      return <SurveillancePage />;
    }

    return <ComingSoon />;
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <HomeLayout
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      onLogout={handleLogout}
    >
      {renderPage()}
    </HomeLayout>
  );
}

export default App;