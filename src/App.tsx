import React, { useState, useEffect } from 'react';
import { AdminService } from './services/admin_service';
import { AdminLoginScreen } from './screens/admin_login_screen';
import { AdminDashboardScreen } from './screens/admin_dashboard_screen';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const logged = await AdminService.verifyAdminSession();
      setIsLoggedIn(logged);
    };
    checkAuth();
  }, []);

  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Iniciando Central AndesMovi Ecuador...</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AdminLoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return <AdminDashboardScreen onLogout={() => setIsLoggedIn(false)} />;
}
