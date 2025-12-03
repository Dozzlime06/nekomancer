import { ethers } from "ethers";
import { ACTIVE_NETWORK } from "./monad";

export const PREDICTION_MARKET_ADDRESS = "0x256f33EB879264679460Df8Ba0eAb96738bCec9B";
export const MANCER_ADDRESS = "0x4e12a73042b4964a065a11a3f7845dc0b2717777";
export const TREASURY_ADDRESS = "0xE9059B5f1C60ecf9C1F07ac2bBa148A75394f56e";

export const PREDICTION_MARKET_ABI = [
  "function usdc() view returns (address)",
  "function owner() view returns (address)",
  "function nextMarketId() view returns (uint256)",
  "function getVersion() view returns (string)",
  "function getTreasury() view returns (address)",
  "function getUserBalance(address user) view returns (uint256)",
  "function getMarket(uint256 marketId) view returns (tuple(uint256 id, address creator, string question, uint8 category, uint256 deadline, uint8 status, uint8 outcome, uint256 yesPool, uint256 noPool, uint256 totalVolume, string targetAsset, uint256 targetPrice, bool priceAbove, uint256 resolvedPrice, uint256 resolvedAt, string metadata))",
  "function getPosition(uint256 marketId, address user) view returns (tuple(uint256 yesShares, uint256 noShares))",
  "function getProposal(uint256 marketId) view returns (tuple(address proposer, uint8 proposedOutcome, uint256 proposedPrice, uint256 proposalTime, uint256 bond, bool challenged, address challenger, uint256 challengeBond, uint8 challengeOutcome, uint256 challengePrice))",
  "function getPrice(uint256 marketId, bool isYes) view returns (uint256)",
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function createMarket(string question, uint8 category, uint256 deadline, string targetAsset, uint256 targetPrice, bool priceAbove) returns (uint256)",
  "function buyShares(uint256 marketId, bool isYes, uint256 amount)",
  "function sellShares(uint256 marketId, bool isYes, uint256 sharesToSell)",
  "function proposeOutcome(uint256 marketId, bool isYes)",
  "function proposeOutcomeWithPrice(uint256 marketId, uint256 currentPrice)",
  "function challengeOutcome(uint256 marketId, uint256 correctPrice)",
  "function finalizeResolution(uint256 marketId)",
  "function voidMarket(uint256 marketId)",
  "function claimWinnings(uint256 marketId)",
  "event MarketCreated(uint256 indexed marketId, address indexed creator, string question, uint256 deadline, string targetAsset, uint256 targetPrice, bool priceAbove)",
  "event SharesPurchased(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount, uint256 shares, uint256 price)",
  "event SharesSold(uint256 indexed marketId, address indexed user, bool isYes, uint256 shares, uint256 amount, uint256 price)",
  "event OutcomeProposed(uint256 indexed marketId, address indexed proposer, uint8 outcome, uint256 price, uint256 bond)",
  "event OutcomeChallenged(uint256 indexed marketId, address indexed challenger, uint8 outcome, uint256 price, uint256 bond)",
  "event MarketResolved(uint256 indexed marketId, uint8 outcome, uint256 resolvedPrice, address winner, uint256 reward)",
  "event MarketVoided(uint256 indexed marketId)",
  "event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)",
  "event Deposited(address indexed user, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount)",
  "event PlatformFeeCollected(uint256 indexed marketId, uint256 amount)"
];

export const MANCER_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

export enum MarketStatus {
  OPEN = 0,
  PENDING_RESOLUTION = 1,
  RESOLVED = 2,
  VOIDED = 3
}

export enum Outcome {
  UNRESOLVED = 0,
  YES = 1,
  NO = 2
}

export enum Category {
  CRYPTO = 0,
  SPORTS = 1,
  POLITICS = 2,
  POP_CULTURE = 3,
  SCIENCE = 4,
  OTHER = 5
}

export const CATEGORY_NAMES = ["Crypto", "Sports", "Politics", "Pop Culture", "Science", "Other"];

export const CATEGORY_RESOLUTION_INFO: Record<number, { type: string; description: string }> = {
  [Category.CRYPTO]: { 
    type: "PRICE ORACLE", 
    description: "Auto-verified against live crypto prices. Anyone can propose with price proof." 
  },
  [Category.SPORTS]: { 
    type: "SPORTS ORACLE", 
    description: "Resolved by game results. Anyone can propose outcome, challengeable for 24h." 
  },
  [Category.POLITICS]: { 
    type: "OPTIMISTIC ORACLE", 
    description: "Bond-based resolution. Propose with 5 $MANCER, challenge with 10 $MANCER." 
  },
  [Category.POP_CULTURE]: { 
    type: "OPTIMISTIC ORACLE", 
    description: "Bond-based resolution. Wrong proposals lose their bond." 
  },
  [Category.SCIENCE]: { 
    type: "OPTIMISTIC ORACLE", 
    description: "Bond-based resolution with 24h challenge window." 
  },
  [Category.OTHER]: { 
    type: "OPTIMISTIC ORACLE", 
    description: "Permissionless resolution. Economic incentives ensure honesty." 
  }
};

export function categoryToNumber(category: string): number {
  switch (category) {
    case "Crypto": return Category.CRYPTO;
    case "Sports": return Category.SPORTS;
    case "Politics": return Category.POLITICS;
    case "Pop Culture": return Category.POP_CULTURE;
    case "Science": return Category.SCIENCE;
    case "Other": return Category.OTHER;
    default: return Category.OTHER;
  }
}

export function categoryToString(category: number): string {
  return CATEGORY_NAMES[category] || "Other";
}

export interface Market {
  id: bigint;
  creator: string;
  question: string;
  category: number;
  deadline: bigint;
  status: MarketStatus;
  outcome: Outcome;
  yesPool: bigint;
  noPool: bigint;
  totalVolume: bigint;
  targetAsset: string;
  targetPrice: bigint;
  priceAbove: boolean;
  resolvedPrice: bigint;
  resolvedAt: bigint;
  metadata: string;
}

export interface Position {
  yesShares: bigint;
  noShares: bigint;
}

export interface Proposal {
  proposer: string;
  proposedOutcome: Outcome;
  proposedPrice: bigint;
  proposalTime: bigint;
  bond: bigint;
  challenged: boolean;
  challenger: string;
  challengeBond: bigint;
  challengeOutcome: Outcome;
  challengePrice: bigint;
}

export function getProvider() {
  return new ethers.JsonRpcProvider(ACTIVE_NETWORK.rpcUrl);
}

export function getContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, provider);
}

export function getMancerContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(MANCER_ADDRESS, MANCER_ABI, provider);
}

// Legacy alias for compatibility
export const getUsdcContract = getMancerContract;

export async function getContractBalance(address: string): Promise<string> {
  if (!address) return "0";
  try {
    const contract = getContract();
    const balance = await contract.getUserBalance(address);
    if (balance === null || balance === undefined) return "0";
    return ethers.formatUnits(balance, 18);
  } catch (error) {
    console.error("Failed to get contract balance:", error);
    return "0";
  }
}

export async function getMancerBalance(address: string): Promise<string> {
  if (!address) return "0";
  try {
    const mancer = getMancerContract();
    const balance = await mancer.balanceOf(address);
    if (balance === null || balance === undefined) return "0";
    return ethers.formatUnits(balance, 18);
  } catch (error) {
    console.error("Failed to get $MANCER balance:", error);
    return "0";
  }
}

// Legacy alias for compatibility
export const getUsdcBalance = getMancerBalance;

export async function getMancerAllowance(owner: string): Promise<string> {
  if (!owner) return "0";
  try {
    const mancer = getMancerContract();
    const allowance = await mancer.allowance(owner, PREDICTION_MARKET_ADDRESS);
    if (allowance === null || allowance === undefined) return "0";
    return ethers.formatUnits(allowance, 18);
  } catch (error) {
    console.error("Failed to get allowance:", error);
    return "0";
  }
}

// Legacy alias for compatibility
export const getUsdcAllowance = getMancerAllowance;

export async function getNativeBalance(address: string): Promise<string> {
  if (!address) return "0";
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    if (balance === null || balance === undefined) return "0";
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Failed to get native balance:", error);
    return "0";
  }
}

export async function getAllMarkets(): Promise<Market[]> {
  try {
    const contract = getContract();
    const nextId = await contract.nextMarketId();
    const markets: Market[] = [];
    
    for (let i = 1; i < Number(nextId); i++) {
      try {
        const market = await contract.getMarket(i);
        markets.push({
          id: market.id,
          creator: market.creator,
          question: market.question,
          category: market.category,
          deadline: market.deadline,
          status: market.status,
          outcome: market.outcome,
          yesPool: market.yesPool,
          noPool: market.noPool,
          totalVolume: market.totalVolume,
          targetAsset: market.targetAsset,
          targetPrice: market.targetPrice,
          priceAbove: market.priceAbove,
          resolvedPrice: market.resolvedPrice,
          resolvedAt: market.resolvedAt,
          metadata: market.metadata || ""
        });
      } catch (e) {
        console.error(`Failed to get market ${i}:`, e);
      }
    }
    
    return markets;
  } catch (error) {
    console.error("Failed to get markets:", error);
    return [];
  }
}

export async function getMarket(marketId: number): Promise<Market | null> {
  try {
    const contract = getContract();
    const market = await contract.getMarket(marketId);
    return {
      id: market.id,
      creator: market.creator,
      question: market.question,
      category: market.category,
      deadline: market.deadline,
      status: market.status,
      outcome: market.outcome,
      yesPool: market.yesPool,
      noPool: market.noPool,
      totalVolume: market.totalVolume,
      targetAsset: market.targetAsset,
      targetPrice: market.targetPrice,
      priceAbove: market.priceAbove,
      resolvedPrice: market.resolvedPrice,
      resolvedAt: market.resolvedAt,
      metadata: market.metadata || ""
    };
  } catch (error) {
    console.error("Failed to get market:", error);
    return null;
  }
}

export async function getPosition(marketId: number, userAddress: string): Promise<Position | null> {
  try {
    const contract = getContract();
    const position = await contract.getPosition(marketId, userAddress);
    return {
      yesShares: position.yesShares,
      noShares: position.noShares
    };
  } catch (error) {
    console.error("Failed to get position:", error);
    return null;
  }
}

export async function getMarketPrice(marketId: number, isYes: boolean): Promise<number> {
  try {
    const contract = getContract();
    const price = await contract.getPrice(marketId, isYes);
    return Number(price) / 100;
  } catch (error) {
    console.error("Failed to get price:", error);
    return 50;
  }
}

export function formatMancer(amount: bigint | null | undefined): string {
  if (amount === null || amount === undefined) return "0";
  return ethers.formatUnits(amount, 18);
}

export function parseMancer(amount: string): bigint {
  if (!amount || amount === "") return BigInt(0);
  return ethers.parseUnits(amount, 18);
}

// Legacy aliases for compatibility
export const formatUsdc = formatMancer;
export const parseUsdc = parseMancer;
