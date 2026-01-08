import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/lib/wallet-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TokensPage from "@/pages/tokens";
import Profile from "@/pages/profile";
import TokenPage from "@/pages/token";
import CreateToken from "@/pages/create";
import CreateMarket from "@/pages/create-market";
import MarketDetail from "@/pages/market";
import PredictionsPage from "@/pages/predictions";
import PredictionDetail from "@/pages/prediction-detail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TokensPage} />
      <Route path="/tokens" component={TokensPage} />
      <Route path="/predictions" component={PredictionsPage} />
      <Route path="/prediction/:ticker" component={PredictionDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/token/:mint" component={TokenPage} />
      <Route path="/create" component={CreateToken} />
      <Route path="/create-market" component={CreateMarket} />
      <Route path="/market/:id" component={MarketDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <Router />
          <Toaster />
          <SonnerToaster position="top-right" theme="dark" />
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
