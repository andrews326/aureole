// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { NotificationProvider } from "@/hooks/use-notification";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";  // ✅ import
import { store, persistor } from "./redux/store";                // ✅ import

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SelfieVerification from "./pages/SelfieVerification";
import Chat from "./pages/Chat";
import Discovery from "./pages/Discovery";
import Onboarding from "./pages/Onboarding";
import Matches from "./pages/Matches";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomNav />
            </BrowserRouter>
          </NotificationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </PersistGate>
  </Provider>
);

export default App;
