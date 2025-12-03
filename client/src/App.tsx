import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider } from "@privy-io/react-auth";
import { PRIVY_APP_ID, monadMainnet } from "./lib/privy";

import Home from "@/pages/Home";
import Markets from "@/pages/Markets";
import Leaderboard from "@/pages/Leaderboard";
import Portfolio from "@/pages/Portfolio";
import Wallet from "@/pages/Wallet";
import CreateEvent from "@/pages/CreateEvent";
import EventDetails from "@/pages/EventDetails";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/markets" component={Markets} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/wallet" component={Wallet} />
      <Route path="/create" component={CreateEvent} />
      <Route path="/event/:id" component={EventDetails} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#836EF9",
        },
        loginMethods: ["wallet"],
        defaultChain: monadMainnet,
        supportedChains: [monadMainnet],
        embeddedWallets: {
          createOnLogin: "off",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster position="top-right" theme="dark" />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App;
