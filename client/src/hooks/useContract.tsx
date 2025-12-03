import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  PREDICTION_MARKET_ADDRESS,
  PREDICTION_MARKET_ABI,
  MANCER_ADDRESS,
  MANCER_ABI,
  getContractBalance,
  getMancerBalance,
  getMancerAllowance,
  getNativeBalance,
  parseMancer,
  Market,
  getAllMarkets,
  getMarket,
  getPosition,
  Position
} from "../lib/contract";

const MONAD_CHAIN_ID = 143;

export function useContract() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  
  const activeWallet = wallets[0];
  const address = activeWallet?.address;
  const isConnected = ready && authenticated && !!address;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSigner = useCallback(async () => {
    if (!isConnected || !activeWallet) {
      throw new Error("Wallet not connected");
    }
    
    try {
      // Try to switch to Monad chain first
      try {
        await activeWallet.switchChain(MONAD_CHAIN_ID);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (switchError: any) {
        console.log("Chain switch error (may be already on correct chain):", switchError);
      }
      
      // Get the EIP-1193 provider from Privy wallet
      const ethereumProvider = await activeWallet.getEthereumProvider();
      
      // Wrap with ethers.js BrowserProvider
      const provider = new ethers.BrowserProvider(ethereumProvider);
      
      return provider.getSigner();
    } catch (e: any) {
      console.error("getSigner error:", e);
      if (e.code === 4001) {
        throw new Error("Connection rejected by user");
      }
      throw new Error(e.message || "Failed to connect to wallet");
    }
  }, [isConnected, activeWallet]);

  const getContractWithSigner = useCallback(async () => {
    const signer = await getSigner();
    return new ethers.Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, signer);
  }, [getSigner]);

  const getMancerWithSigner = useCallback(async () => {
    const signer = await getSigner();
    return new ethers.Contract(MANCER_ADDRESS, MANCER_ABI, signer);
  }, [getSigner]);

  const approveMancer = useCallback(async (amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const mancer = await getMancerWithSigner();
      const tx = await mancer.approve(PREDICTION_MARKET_ADDRESS, parseMancer(amount));
      await tx.wait();
      return true;
    } catch (e: any) {
      console.error("Approve error:", e);
      const msg = e.message?.toLowerCase() || "";
      const shortMsg = e.shortMessage?.toLowerCase() || "";
      
      if (e.code === 4001 || e.code === "ACTION_REJECTED") {
        setError("Transaction rejected by user");
      } else if (msg.includes("insufficient funds for gas") || shortMsg.includes("insufficient funds")) {
        setError("Need MON for gas fees. Add MON to your wallet.");
      } else if (msg.includes("network") || msg.includes("chain") || msg.includes("switch")) {
        setError("Please switch to Monad network (Chain ID 143)");
      } else if (msg.includes("user rejected") || msg.includes("user denied")) {
        setError("Transaction rejected by user");
      } else {
        setError(e.shortMessage || e.reason || e.message || "Approval failed");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [getMancerWithSigner]);

  const deposit = useCallback(async (amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.deposit(parseMancer(amount));
      await tx.wait();
      return true;
    } catch (e: any) {
      console.error("Deposit error:", e);
      const msg = e.message?.toLowerCase() || "";
      const shortMsg = e.shortMessage?.toLowerCase() || "";
      
      if (e.code === 4001 || e.code === "ACTION_REJECTED") {
        setError("Transaction rejected by user");
      } else if (msg.includes("insufficient funds for gas") || shortMsg.includes("insufficient funds")) {
        setError("Need MON for gas fees. Add MON to your wallet.");
      } else if (msg.includes("allowance") || msg.includes("approve") || msg.includes("erc20")) {
        setError("Please approve $MANCER first");
      } else if (msg.includes("user rejected") || msg.includes("user denied")) {
        setError("Transaction rejected by user");
      } else {
        setError(e.shortMessage || e.reason || e.message || "Deposit failed");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  const withdraw = useCallback(async (amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.withdraw(parseMancer(amount));
      await tx.wait();
      return true;
    } catch (e: any) {
      setError(e.message || "Withdrawal failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  const createMarket = useCallback(async (
    question: string,
    category: string,
    deadline: number,
    targetAsset: string,
    targetPrice: string,
    priceAbove: boolean
  ) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const priceInUnits = targetPrice && targetPrice !== "0" ? ethers.parseUnits(targetPrice, 6) : BigInt(0);
      const categoryNum = 0;
      const tx = await contract.createMarket(question, categoryNum, deadline, targetAsset || "", priceInUnits, priceAbove);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "MarketCreated";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = contract.interface.parseLog(event);
        return Number(parsed?.args.marketId);
      }
      return null;
    } catch (e: any) {
      setError(e.message || "Market creation failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  const buyShares = useCallback(async (marketId: number, isYes: boolean, amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.buyShares(marketId, isYes, parseMancer(amount));
      await tx.wait();
      return true;
    } catch (e: any) {
      setError(e.message || "Buy failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  const sellShares = useCallback(async (marketId: number, isYes: boolean, shares: string) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.sellShares(marketId, isYes, parseMancer(shares));
      await tx.wait();
      return true;
    } catch (e: any) {
      setError(e.message || "Sell failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  const proposeOutcomeWithPrice = useCallback(async (marketId: number, currentPrice: string) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const priceInUnits = ethers.parseUnits(currentPrice, 6);
      const tx = await contract.proposeOutcomeWithPrice(marketId, priceInUnits);
      await tx.wait();
      return true;
    } catch (e: any) {
      setError(e.message || "Proposal failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  const proposeOutcome = useCallback(async (marketId: number, isYes: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.proposeOutcome(marketId, isYes);
      await tx.wait();
      return true;
    } catch (e: any) {
      setError(e.message || "Proposal failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  const challengeOutcome = useCallback(async (marketId: number, correctPrice: string) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const priceInUnits = ethers.parseUnits(correctPrice, 6);
      const tx = await contract.challengeOutcome(marketId, priceInUnits);
      await tx.wait();
      return true;
    } catch (e: any) {
      setError(e.message || "Challenge failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  const finalizeResolution = useCallback(async (marketId: number) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.finalizeResolution(marketId);
      await tx.wait();
      return true;
    } catch (e: any) {
      setError(e.message || "Finalization failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  const claimWinnings = useCallback(async (marketId: number) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.claimWinnings(marketId);
      await tx.wait();
      return true;
    } catch (e: any) {
      setError(e.message || "Claim failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getContractWithSigner]);

  return {
    address,
    isConnected,
    loading,
    error,
    approveMancer,
    approveUsdc: approveMancer,
    deposit,
    withdraw,
    createMarket,
    buyShares,
    sellShares,
    proposeOutcome,
    proposeOutcomeWithPrice,
    challengeOutcome,
    finalizeResolution,
    claimWinnings,
    getContractBalance: () => address ? getContractBalance(address) : Promise.resolve("0"),
    getMancerBalance: () => address ? getMancerBalance(address) : Promise.resolve("0"),
    getUsdcBalance: () => address ? getMancerBalance(address) : Promise.resolve("0"),
    getMancerAllowance: () => address ? getMancerAllowance(address) : Promise.resolve("0"),
    getUsdcAllowance: () => address ? getMancerAllowance(address) : Promise.resolve("0"),
    getNativeBalance: () => address ? getNativeBalance(address) : Promise.resolve("0"),
    getAllMarkets,
    getMarket,
    getPosition: (marketId: number) => address ? getPosition(marketId, address) : Promise.resolve(null)
  };
}
