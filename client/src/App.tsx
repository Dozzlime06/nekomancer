import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { config } from "./lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

import Home from "@/pages/Home";
import Markets from "@/pages/Markets";
import Leaderboard from "@/pages/Leaderboard";
import Portfolio from "@/pages/Portfolio";
import Wallet from "@/pages/Wallet";
import CreateEvent from "@/pages/CreateEvent";
import EventDetails from "@/pages/EventDetails";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#836EF9",
            accentColorForeground: "white",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
          modalSize="compact"
        >
          <TooltipProvider>
            <Toaster />
            <SonnerToaster position="top-right" theme="dark" />
            <Router />
          </TooltipProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
