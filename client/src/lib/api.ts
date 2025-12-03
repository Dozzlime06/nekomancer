import { queryClient } from "./queryClient";

const API_BASE = "/api";

export interface Event {
  id: number;
  question: string;
  category: string;
  deadline: string;
  resolved: boolean;
  outcome: string | null;
  yesPrice: string;
  noPrice: string;
  volume: string;
  poolSize: string;
  createdAt: string;
  creatorAddress: string | null;
  creatorFee: string | null;
  resolutionSource: string | null;
  resolutionProof: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  targetAsset: string | null;
  targetPrice: string | null;
  priceCondition: string | null;
  sportType: string | null;
  teamA: string | null;
  teamB: string | null;
  gameId: string | null;
}

export interface User {
  id: number;
  walletAddress: string;
  balance: string;
  totalProfit: string;
  totalVolume: string;
  winRate: string;
  createdAt: string;
}

export interface Bet {
  id: number;
  userId: number;
  eventId: number;
  option: string;
  amount: string;
  shares: string;
  avgPrice: string;
  settled: boolean;
  payout: string | null;
  createdAt: string;
  event?: Event;
}

// Events
export async function fetchEvents(): Promise<Event[]> {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function fetchEvent(id: number): Promise<Event> {
  const res = await fetch(`${API_BASE}/events/${id}`);
  if (!res.ok) throw new Error("Failed to fetch event");
  return res.json();
}

// Users
export async function connectWallet(walletAddress: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to connect wallet");
  return res.json();
}

export async function fetchUser(walletAddress: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${walletAddress}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

// Bets
export async function placeBet(
  walletAddress: string,
  eventId: number,
  option: "YES" | "NO",
  amount: number
): Promise<{ bet: Bet; newBalance: string }> {
  const res = await fetch(`${API_BASE}/bets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, eventId, option, amount }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to place bet");
  }
  // Invalidate queries after placing bet
  queryClient.invalidateQueries({ queryKey: ["events"] });
  queryClient.invalidateQueries({ queryKey: ["user"] });
  queryClient.invalidateQueries({ queryKey: ["userBets"] });
  return res.json();
}

export async function fetchUserBets(walletAddress: string): Promise<Bet[]> {
  const res = await fetch(`${API_BASE}/bets/user/${walletAddress}`);
  if (!res.ok) throw new Error("Failed to fetch bets");
  return res.json();
}

// Leaderboard
export async function fetchLeaderboard(limit: number = 10): Promise<User[]> {
  const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}
