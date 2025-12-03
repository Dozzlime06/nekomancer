import { db } from "./db";
import { events, bets, users } from "@shared/schema";
import { eq, and, lte, isNull } from "drizzle-orm";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

const CRYPTO_IDS: Record<string, string> = {
  bitcoin: "bitcoin",
  btc: "bitcoin",
  ethereum: "ethereum",
  eth: "ethereum",
  solana: "solana",
  sol: "solana",
  monad: "monad",
  mon: "monad",
};

export interface ResolutionResult {
  outcome: "YES" | "NO";
  proof: object;
  source: string;
}

export async function getCryptoPrice(asset: string): Promise<number | null> {
  try {
    const coinId = CRYPTO_IDS[asset.toLowerCase()] || asset.toLowerCase();
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data[coinId]?.usd || null;
  } catch (error) {
    console.error("Error fetching crypto price:", error);
    return null;
  }
}

export async function resolveCryptoEvent(
  eventId: number,
  targetAsset: string,
  targetPrice: number,
  condition: string
): Promise<ResolutionResult | null> {
  const currentPrice = await getCryptoPrice(targetAsset);
  
  if (currentPrice === null) {
    console.error(`Could not fetch price for ${targetAsset}`);
    return null;
  }
  
  let outcome: "YES" | "NO";
  
  if (condition === "above") {
    outcome = currentPrice >= targetPrice ? "YES" : "NO";
  } else if (condition === "below") {
    outcome = currentPrice <= targetPrice ? "YES" : "NO";
  } else {
    return null;
  }
  
  return {
    outcome,
    proof: {
      asset: targetAsset,
      targetPrice,
      actualPrice: currentPrice,
      condition,
      timestamp: new Date().toISOString(),
      source: "coingecko",
    },
    source: "coingecko",
  };
}

export async function resolveEvent(eventId: number): Promise<boolean> {
  try {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    
    if (!event || event.resolved) {
      return false;
    }
    
    let result: ResolutionResult | null = null;
    
    if (event.category === "Crypto" && event.targetAsset && event.targetPrice && event.priceCondition) {
      result = await resolveCryptoEvent(
        eventId,
        event.targetAsset,
        parseFloat(event.targetPrice),
        event.priceCondition
      );
    }
    
    if (!result) {
      console.log(`No automated resolution available for event ${eventId}`);
      return false;
    }
    
    await db.update(events).set({
      resolved: true,
      outcome: result.outcome,
      resolutionSource: result.source,
      resolutionProof: JSON.stringify(result.proof),
      resolvedBy: "system",
      resolvedAt: new Date(),
    }).where(eq(events.id, eventId));
    
    await settleBets(eventId, result.outcome);
    
    console.log(`Event ${eventId} resolved: ${result.outcome}`);
    return true;
  } catch (error) {
    console.error(`Error resolving event ${eventId}:`, error);
    return false;
  }
}

export async function settleBets(eventId: number, outcome: string): Promise<void> {
  const eventBets = await db.select().from(bets).where(
    and(eq(bets.eventId, eventId), eq(bets.settled, false))
  );
  
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return;
  
  const creatorFee = parseFloat(event.creatorFee || "2") / 100;
  
  for (const bet of eventBets) {
    const isWinner = bet.option === outcome;
    let payout = 0;
    
    if (isWinner) {
      const grossPayout = parseFloat(bet.shares);
      const fee = grossPayout * creatorFee;
      payout = grossPayout - fee;
      
      const [user] = await db.select().from(users).where(eq(users.id, bet.userId));
      if (user) {
        const newBalance = parseFloat(user.balance) + payout;
        const newProfit = parseFloat(user.totalProfit) + (payout - parseFloat(bet.amount));
        
        await db.update(users).set({
          balance: newBalance.toFixed(2),
          totalProfit: newProfit.toFixed(2),
        }).where(eq(users.id, bet.userId));
      }
      
      if (event.creatorAddress) {
        const [creator] = await db.select().from(users)
          .where(eq(users.walletAddress, event.creatorAddress));
        if (creator) {
          const newCreatorBalance = parseFloat(creator.balance) + fee;
          await db.update(users).set({
            balance: newCreatorBalance.toFixed(2),
          }).where(eq(users.id, creator.id));
        }
      }
    }
    
    await db.update(bets).set({
      settled: true,
      payout: payout.toFixed(2),
    }).where(eq(bets.id, bet.id));
  }
}

export async function checkAndResolveExpiredEvents(): Promise<number> {
  const now = new Date();
  
  const expiredEvents = await db.select().from(events).where(
    and(
      eq(events.resolved, false),
      lte(events.deadline, now)
    )
  );
  
  let resolvedCount = 0;
  
  for (const event of expiredEvents) {
    const success = await resolveEvent(event.id);
    if (success) resolvedCount++;
  }
  
  return resolvedCount;
}

let resolutionInterval: NodeJS.Timeout | null = null;

export function startResolutionCron(intervalMinutes: number = 5): void {
  if (resolutionInterval) {
    clearInterval(resolutionInterval);
  }
  
  console.log(`Starting resolution cron job (every ${intervalMinutes} minutes)`);
  
  checkAndResolveExpiredEvents().then(count => {
    if (count > 0) console.log(`Initial check: resolved ${count} events`);
  });
  
  resolutionInterval = setInterval(async () => {
    const count = await checkAndResolveExpiredEvents();
    if (count > 0) console.log(`Cron: resolved ${count} events`);
  }, intervalMinutes * 60 * 1000);
}

export function stopResolutionCron(): void {
  if (resolutionInterval) {
    clearInterval(resolutionInterval);
    resolutionInterval = null;
    console.log("Resolution cron job stopped");
  }
}
