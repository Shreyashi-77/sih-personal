import { useState } from "react";
import { Header } from "@/components/header/Header";
import { NavigationDrawer } from "@/components/navigation/NavigationDrawer";
import { DashboardPage } from "@/pages/DashboardPage";
import { NavigationPage } from "@/pages/NavigationPage";
import { AlertsPage } from "@/pages/AlertsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LoginPage } from "@/pages/LoginPage";
import { useLanguage } from "@/lib/i18n";

export interface UserData {
  fullName: string;
  username: string;
}

function App() {
  const { setLanguage } = useLanguage();
  const [user, setUser] = useState<UserData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  if (!user) {
    return (
      <LoginPage
        onLogin={(userData, lang) => {
          setLanguage(lang);
          setUser(userData);
        }}
      />
    );
  }

  const handleNavigate = (page: string) => {
    if (page === "logout") {
      setUser(null);
      setCurrentPage("dashboard");
    } else {
      setCurrentPage(page);
    }
  };

  return (
    <div className="h-dvh flex overflow-hidden bg-background">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-transparent relative">
        {/* Header (Top) */}
        <Header onMenuClick={() => setDrawerOpen(true)} />

        {currentPage === "dashboard" && <DashboardPage />}
        {currentPage === "navigation" && (
          <NavigationPage onBack={() => setCurrentPage("dashboard")} />
        )}
        {currentPage === "alerts" && <AlertsPage />}
        {currentPage === "settings" && (
          <SettingsPage onLogout={() => setUser(null)} />
        )}
      </main>

      {/* Navigation Drawer (Mobile only) */}
      <NavigationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onNavigate={handleNavigate}
        user={user}
      />
    </div>
  );
}

export default App;
