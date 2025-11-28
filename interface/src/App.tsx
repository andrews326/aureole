// src/App.tsx

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState, store } from "@/redux/store";
import { getCallService } from "@/services/callServiceInstance";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageLayout from "@/components/layout/PageLayout";
import { NotificationProvider } from "@/hooks/use-notification";
import { Provider } from "react-redux";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SelfieVerification from "./pages/SelfieVerification";
import Chat from "./pages/Chat";
import Discovery from "./pages/Discovery";
import Onboarding from "./pages/Onboarding";
import Matches from "./pages/Matches";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import NotificationsPage from "./pages/Notifications";
import ViewProfile from "./pages/ViewProfile";
import CallUI from "@/components/call/CallUI";

const queryClient = new QueryClient();

// Inner app that can use hooks
function AppShell() {
  const auth = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const userId = auth.user?.id;
    const token = auth.token;

    if (!userId || !token) return;

    const cs = getCallService(userId, token);
    cs?.connect();
  }, [auth.user?.id, auth.token]);

  return (
    <BrowserRouter>
      <div className="relative min-h-screen overflow-hidden">
        <div className="relative z-10">
          <Toaster />
          <Sonner />
          {/* GLOBAL CALL UI OVERLAY */}
          <CallUI />

          {/* Page Content */}
          <PageLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/verify-selfie" element={<SelfieVerification />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/profile/setup" element={<Onboarding />} />
              <Route path="/chat/:userId" element={<Chat />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notification" element={<NotificationsPage />} />
              <Route path="/view-profile" element={<ViewProfile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageLayout>

          <BottomNav />
        </div>
      </div>
    </BrowserRouter>
  );
}

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationProvider>
          <AppShell />
        </NotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
