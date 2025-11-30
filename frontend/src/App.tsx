import { useState, useEffect } from 'react';
import HomeLayout from './layouts/HomeLayout';
import SurveillancePage from './pages/Surveillance';
import ComingSoon from './pages/ComingSoon';
import LoginPage from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import { authService, type User } from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<string>('dashboard'); 
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        // Verify token is still valid by fetching user info
        const user = await authService.getCurrentUserInfo();
        if (user) {
          setIsAuthenticated(true);
          setCurrentUser(user);
        } else {
          // Token is invalid, clear it
          authService.logout();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (email: string, password: string) => {
    // Login is handled by the Login component via authService
    // This callback is called after successful login
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setIsAuthenticated(true);
    setActiveMenu('dashboard'); // Redirect to dashboard/homepage
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveMenu('dashboard');
    setSidebarOpen(true);
  };

  const renderPage = () => {
    if (activeMenu === 'dashboard') {
      return <DashboardHome activeMenu={activeMenu} />;
    }
    if (activeMenu === 'surveillance') {
      return <SurveillancePage />;
    }

    return <ComingSoon />;
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-cyan-400">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

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
      currentUser={currentUser}
    >
      {renderPage()}
    </HomeLayout>
  );
}

export default App;