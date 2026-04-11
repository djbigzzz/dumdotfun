import { Switch, Route } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/lib/wallet-context";
import { PrivacyProvider } from "@/lib/privacy-context";
import { initMobileApp } from "@/lib/mobile-utils";
import NotFound from "@/pages/not-found";
import TokensPage from "@/pages/tokens";

const Home = lazy(() => import("@/pages/home"));
const Profile = lazy(() => import("@/pages/profile"));
const TokenPage = lazy(() => import("@/pages/token"));
const CreateToken = lazy(() => import("@/pages/create"));
const MarketDetail = lazy(() => import("@/pages/market"));
const DocsPage = lazy(() => import("@/pages/docs"));
const CareersPage = lazy(() => import("@/pages/careers"));
const AdminPage = lazy(() => import("@/pages/admin"));
const TrendingPage = lazy(() => import("@/pages/trending"));
const SearchPage = lazy(() => import("@/pages/search"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));
const QuestsPage = lazy(() => import("@/pages/quests"));

const LazyLegal = lazy(() =>
  import("@/pages/legal").then((m) => ({
    default: m.PrivacyPolicy,
  }))
);
const LazyEULA = lazy(() =>
  import("@/pages/legal").then((m) => ({
    default: m.EULA,
  }))
);
const LazyCopyright = lazy(() =>
  import("@/pages/legal").then((m) => ({
    default: m.Copyright,
  }))
);

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={TokensPage} />
        <Route path="/tokens" component={TokensPage} />
        <Route path="/docs" component={DocsPage} />
        <Route path="/careers" component={CareersPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/profile" component={Profile} />
        <Route path="/token/:mint" component={TokenPage} />
        <Route path="/create" component={CreateToken} />
        <Route path="/market/:id" component={MarketDetail} />
        <Route path="/trending" component={TrendingPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/quests" component={QuestsPage} />
        <Route path="/legal/privacy" component={LazyLegal} />
        <Route path="/legal/eula" component={LazyEULA} />
        <Route path="/legal/copyright" component={LazyCopyright} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
