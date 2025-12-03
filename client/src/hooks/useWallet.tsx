import { useAccount, useBalance } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { connectWallet as apiConnectWallet, type User } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";

const USDC_CONTRACT = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603" as const;

export function useWallet() {
  const account = useAccount();
  const { address, isConnected } = account;
  
  const balanceQuery = useBalance({ 
    address: address,
    token: USDC_CONTRACT,
  });
  
  const [user, setUser] = useState<User | null>(null);

  const { data: userData, refetch } = useQuery({
    queryKey: ["user", address],
    queryFn: async () => {
      if (!address) return null;
      return apiConnectWallet(address);
    },
    enabled: !!address && isConnected,
  });

  useEffect(() => {
    if (userData) {
      setUser(userData);
    } else if (!isConnected) {
      setUser(null);
    }
  }, [userData, isConnected]);

  const refreshUser = useCallback(async () => {
    if (address) {
      await refetch();
    }
  }, [address, refetch]);

  return {
    isConnected: isConnected ?? false,
    walletAddress: address ?? null,
    user,
    balance: balanceQuery.data?.formatted ?? "0",
    symbol: balanceQuery.data?.symbol ?? "MON",
    refreshUser,
  };
}
