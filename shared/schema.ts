import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp, boolean, decimal, serial, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  balance: decimal("balance", { precision: 18, scale: 2 }).notNull().default("0.00"),
  totalProfit: decimal("total_profit", { precision: 18, scale: 2 }).notNull().default("0.00"),
  totalVolume: decimal("total_volume", { precision: 18, scale: 2 }).notNull().default("0.00"),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: text("category").notNull(),
  deadline: timestamp("deadline").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  outcome: text("outcome"),
  yesPrice: decimal("yes_price", { precision: 5, scale: 4 }).notNull().default("0.5000"),
  noPrice: decimal("no_price", { precision: 5, scale: 4 }).notNull().default("0.5000"),
  volume: decimal("volume", { precision: 18, scale: 2 }).notNull().default("0.00"),
  poolSize: decimal("pool_size", { precision: 18, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Creator info
  creatorAddress: text("creator_address"),
  creatorFee: decimal("creator_fee", { precision: 5, scale: 2 }).notNull().default("2.00"), // 2% default
  // Resolution metadata
  resolutionSource: text("resolution_source"), // "coingecko", "sports_api", "news_api", "ai_verified"
  resolutionProof: text("resolution_proof"), // JSON with API response/proof data
  resolvedBy: text("resolved_by"), // "system" for automated
  resolvedAt: timestamp("resolved_at"),
  // For crypto price events
  targetAsset: text("target_asset"), // "bitcoin", "ethereum", "solana", "monad"
  targetPrice: decimal("target_price", { precision: 18, scale: 2 }),
  priceCondition: text("price_condition"), // "above", "below"
  // For sports events
  sportType: text("sport_type"), // "basketball", "football", "soccer"
  teamA: text("team_a"),
  teamB: text("team_b"),
  gameId: text("game_id"), // external API game ID
});

export const bets = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventId: integer("event_id").notNull().references(() => events.id),
  option: text("option").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  shares: decimal("shares", { precision: 18, scale: 4 }).notNull(),
  avgPrice: decimal("avg_price", { precision: 5, scale: 4 }).notNull(),
  settled: boolean("settled").notNull().default(false),
  payout: decimal("payout", { precision: 18, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  balance: true,
  totalProfit: true,
  totalVolume: true,
  winRate: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  resolved: true,
  outcome: true,
  volume: true,
  poolSize: true,
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  createdAt: true,
  settled: true,
  payout: true,
});

export const placeBetSchema = z.object({
  walletAddress: z.string().min(1),
  eventId: z.number(),
  option: z.enum(["YES", "NO"]),
  amount: z.number().positive(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Bet = typeof bets.$inferSelect;
export type InsertBet = z.infer<typeof insertBetSchema>;
export type PlaceBetInput = z.infer<typeof placeBetSchema>;
