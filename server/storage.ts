import { 
  type User, type InsertUser, 
  type Event, type InsertEvent,
  type Bet, type InsertBet, type PlaceBetInput,
  users, events, bets
} from "@shared/schema";
import { db } from "./db.js";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(walletAddress: string): Promise<User>;
  updateUserBalance(id: number, balance: string): Promise<User | undefined>;
  getLeaderboard(limit?: number): Promise<User[]>;
  
  // Events
  getAllEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEventPrices(id: number, yesPrice: string, noPrice: string, volume: string, poolSize: string): Promise<Event | undefined>;
  resolveEvent(id: number, outcome: "YES" | "NO"): Promise<Event | undefined>;
  
  // Bets
  placeBet(userId: number, eventId: number, option: string, amount: string, shares: string, avgPrice: string): Promise<Bet>;
  getUserBets(userId: number): Promise<(Bet & { event: Event })[]>;
  getBetsByEvent(eventId: number): Promise<Bet[]>;
  settleBet(betId: number, payout: string): Promise<Bet | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user;
  }

  async createUser(walletAddress: string): Promise<User> {
    const [user] = await db.insert(users).values({ walletAddress }).returning();
    return user;
  }

  async updateUserBalance(id: number, balance: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ balance }).where(eq(users.id, id)).returning();
    return user;
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.totalProfit)).limit(limit);
  }

  // Events
  async getAllEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(desc(events.createdAt));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEventPrices(id: number, yesPrice: string, noPrice: string, volume: string, poolSize: string): Promise<Event | undefined> {
    const [event] = await db.update(events)
      .set({ yesPrice, noPrice, volume, poolSize })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async resolveEvent(id: number, outcome: "YES" | "NO"): Promise<Event | undefined> {
    const [event] = await db.update(events)
      .set({ resolved: true, outcome })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  // Bets
  async placeBet(userId: number, eventId: number, option: string, amount: string, shares: string, avgPrice: string): Promise<Bet> {
    const [bet] = await db.insert(bets).values({
      userId,
      eventId,
      option,
      amount,
      shares,
      avgPrice
    }).returning();
    return bet;
  }

  async getUserBets(userId: number): Promise<(Bet & { event: Event })[]> {
    const result = await db
      .select()
      .from(bets)
      .innerJoin(events, eq(bets.eventId, events.id))
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.createdAt));
    
    return result.map((r: { bets: Bet; events: Event }) => ({ ...r.bets, event: r.events }));
  }

  async getBetsByEvent(eventId: number): Promise<Bet[]> {
    return db.select().from(bets).where(eq(bets.eventId, eventId));
  }

  async settleBet(betId: number, payout: string): Promise<Bet | undefined> {
    const [bet] = await db.update(bets)
      .set({ settled: true, payout })
      .where(eq(bets.id, betId))
      .returning();
    return bet;
  }
}

export const storage = new DatabaseStorage();
