import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";

export const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://monadvision.com",
    },
  },
});

export const config = getDefaultConfig({
  appName: "Nekomancer",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "5b1ae833abd22d348cbf5d53cf58b3b2",
  chains: [monadMainnet],
  transports: {
    [monadMainnet.id]: http("https://rpc.monad.xyz"),
  },
  ssr: false,
});
