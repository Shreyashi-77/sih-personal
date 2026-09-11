
import { useEffect, useState } from "react";

import { Header } from "@/components/header/Header";
import { NavigationDrawer } from "@/components/navigation/NavigationDrawer";

import { DashboardPage } from "@/pages/DashboardPage";
import { NavigationPage } from "@/pages/NavigationPage";
import { AlertsPage } from "@/pages/AlertsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LoginPage } from "@/pages/LoginPage";

import { useLanguage } from "@/lib/i18n";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface UserData {
  fullName: string;
  username: string;

  email: string;
}

function App() {
  const { setLanguage } = useLanguage();

  const [user, setUser] = useState<UserData | null>(null);

  // Important:
  // Firebase needs a moment to check whether the user
  // is already authenticated.
  const [authLoading, setAuthLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  // ---------------------------------------------
  // LISTEN FOR FIREBASE AUTHENTICATION STATE
  // ---------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is authenticated
        setUser({
          fullName: firebaseUser.displayName || "",
          email: firebaseUser.email || "",
        });
      } else {
        // User is not authenticated
        setUser(null);
      }

      setAuthLoading(false);
    });

    // Cleanup Firebase listener
    return () => unsubscribe();
  }, []);

  // ---------------------------------------------
  // SHOW LOADING WHILE FIREBASE CHECKS SESSION
  // ---------------------------------------------

  if (authLoading) {
    return (
      <div className="min-h-dvh w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />

          <p className="text-sm text-muted-foreground">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // USER NOT LOGGED IN
  // ---------------------------------------------

  if (!user) {
    return (
      <LoginPage
        onLogin={(userData, lang) => {
          setLanguage(lang);

          // Firebase authentication listener will also
          // update this automatically.
          setUser(userData);
        }}
      />
    );
  }

  // ---------------------------------------------
  // LOGOUT
  // ---------------------------------------------

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setUser(null);
      setCurrentPage("dashboard");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ---------------------------------------------
  // NAVIGATION
  // ---------------------------------------------

  const handleNavigate = (page: string) => {
    if (page === "logout") {
      handleLogout();
    } else {
      setCurrentPage(page);
    }
  };

  // ---------------------------------------------
  // AUTHENTICATED APPLICATION
  // ---------------------------------------------

  return (
    <div className="h-dvh flex overflow-hidden bg-background">

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-transparent relative">

        {/* Header */}
        <Header
          onMenuClick={() => setDrawerOpen(true)}
        />

        {/* Pages */}
        {currentPage === "dashboard" && (
          <DashboardPage />
        )}

        {currentPage === "navigation" && (
          <NavigationPage />
        )}

        {currentPage === "alerts" && (
          <AlertsPage />
        )}

        {currentPage === "settings" && (
          <SettingsPage
            onLogout={handleLogout}
          />
        )}

      </main>

      {/* Navigation Drawer */}
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

