import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import {
  PREDICTION_MARKET_ADDRESS,
  PREDICTION_MARKET_ABI,
  USDC_ADDRESS,
  USDC_ABI,
  getContractBalance,
  getUsdcBalance,
  getUsdcAllowance,
  getNativeBalance,
  parseUsdc,
  Market,
  getAllMarkets,
  getMarket,
  getPosition,
  Position
} from "../lib/contract";

const MONAD_CHAIN_ID = 143;

export function useContract() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSigner = useCallback(async () => {
    if (!window.ethereum) throw new Error("No wallet found. Please install MetaMask.");
    if (!isConnected) throw new Error("Wallet not connected");
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== MONAD_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x8f' }],
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x8f',
                chainName: 'Monad',
                nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                rpcUrls: ['https://rpc.monad.xyz'],
                blockExplorerUrls: ['https://monadvision.com']
              }],
            });
          } catch (addError) {
            throw new Error("Please add Monad network to your wallet");
          }
        } else if (switchError.code === 4001) {
          throw new Error("Please switch to Monad network");
        } else {
          throw new Error("Failed to switch network");
        }
      }
    }
    
    try {
      return await provider.getSigner();
    } catch (e: any) {
      if (e.code === 4001) {
        throw new Error("Connection rejected by user");
      }
      throw new Error("Failed to connect to wallet");
    }
  }, [isConnected]);

  const getContractWithSigner = useCallback(async () => {
    const signer = await getSigner();
    return new ethers.Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, signer);
  }, [getSigner]);

  const getUsdcWithSigner = useCallback(async () => {
    const signer = await getSigner();
    return new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
  }, [getSigner]);

  const approveUsdc = useCallback(async (amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const usdc = await getUsdcWithSigner();
      const tx = await usdc.approve(PREDICTION_MARKET_ADDRESS, parseUsdc(amount));
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
  }, [getUsdcWithSigner]);

  const deposit = useCallback(async (amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.deposit(parseUsdc(amount));
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
        setError("Please approve USDC first");
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
      const tx = await contract.withdraw(parseUsdc(amount));
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
      // Category is always 0 (CRYPTO) for now - contract only supports CRYPTO
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
      const tx = await contract.buyShares(marketId, isYes, parseUsdc(amount));
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
      const tx = await contract.sellShares(marketId, isYes, parseUsdc(shares));
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
    approveUsdc,
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
    getUsdcBalance: () => address ? getUsdcBalance(address) : Promise.resolve("0"),
    getUsdcAllowance: () => address ? getUsdcAllowance(address) : Promise.resolve("0"),
    getNativeBalance: () => address ? getNativeBalance(address) : Promise.resolve("0"),
    getAllMarkets,
    getMarket,
    getPosition: (marketId: number) => address ? getPosition(marketId, address) : Promise.resolve(null)
  };
}
