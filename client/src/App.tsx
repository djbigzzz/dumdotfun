import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/lib/wallet-context";
import { PrivacyProvider } from "@/lib/privacy-context";
import { initMobileApp } from "@/lib/mobile-utils";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TokensPage from "@/pages/tokens";
import Profile from "@/pages/profile";
import UserProfilePage from "@/pages/user-profile";
import TokenPage from "@/pages/token";
import CreateToken from "@/pages/create";
import CreateMarket from "@/pages/create-market";
import MarketDetail from "@/pages/market";
import PredictionsPage from "@/pages/predictions";
import PredictionDetail from "@/pages/prediction-detail";
import DocsPage from "@/pages/docs";
import AdminPage from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TokensPage} />
      <Route path="/tokens" component={TokensPage} />
      <Route path="/predictions" component={PredictionsPage} />
      <Route path="/prediction/:ticker" component={PredictionDetail} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/profile" component={Profile} />
      <Route path="/user/:wallet" component={UserProfilePage} />
      <Route path="/token/:mint" component={TokenPage} />
      <Route path="/create" component={CreateToken} />
      <Route path="/create-market" component={CreateMarket} />
      <Route path="/market/:id" component={MarketDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    initMobileApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PrivacyProvider>
          <WalletProvider>
            <Router />
            <Toaster />
            <SonnerToaster position="top-right" theme="dark" />
          </WalletProvider>
        </PrivacyProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
