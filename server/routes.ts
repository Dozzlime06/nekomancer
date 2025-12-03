import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { placeBetSchema, insertEventSchema } from "@shared/schema";
import { resolveEvent, checkAndResolveExpiredEvents, getCryptoPrice, startResolutionCron } from "./resolution";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ EVENTS ============
  
  // Get all events
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get single event
  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  // Create event
  app.post("/api/events", async (req, res) => {
    try {
      const parsed = insertEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      const data = parsed.data;
      
      // Validate crypto events have required resolution fields
      if (data.category === "Crypto") {
        if (!data.targetAsset || !data.targetPrice || !data.priceCondition) {
          return res.status(400).json({ 
            error: "Crypto events require targetAsset, targetPrice, and priceCondition for auto-resolution" 
          });
        }
        // Ensure resolution source is set
        data.resolutionSource = "coingecko";
      }
      
      const event = await storage.createEvent(data);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // ============ USERS ============

  // Get or create user by wallet
  app.post("/api/users/connect", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      let user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        user = await storage.createUser(walletAddress);
      }
      res.json(user);
    } catch (error) {
      console.error("Error connecting user:", error);
      res.status(500).json({ error: "Failed to connect user" });
    }
  });

  // Get user by wallet
  app.get("/api/users/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWallet(req.params.walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ============ BETS ============

  // Place a bet
  app.post("/api/bets", async (req, res) => {
    try {
      const parsed = placeBetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }

      const { walletAddress, eventId, option, amount } = parsed.data;

      // Get or create user
      let user = await storage.getUserByWallet(walletAddress);
      if (!user) {
        user = await storage.createUser(walletAddress);
      }

      // Check balance
      const userBalance = parseFloat(user.balance);
      if (userBalance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Get event
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (event.resolved) {
        return res.status(400).json({ error: "Event already resolved" });
      }

      // Calculate shares and price
      const price = option === "YES" ? parseFloat(event.yesPrice) : parseFloat(event.noPrice);
      const shares = amount / price;

      // Update user balance
      const newBalance = (userBalance - amount).toFixed(2);
      await storage.updateUserBalance(user.id, newBalance);

      // Place bet
      const bet = await storage.placeBet(
        user.id,
        eventId,
        option,
        amount.toFixed(2),
        shares.toFixed(4),
        price.toFixed(4)
      );

      // Update event volume and prices (simple AMM simulation)
      const newVolume = (parseFloat(event.volume) + amount).toFixed(2);
      const newPoolSize = (parseFloat(event.poolSize) + amount).toFixed(2);
      
      // Adjust prices based on betting (simplified)
      const totalPool = parseFloat(newPoolSize);
      const yesAdjustment = option === "YES" ? 0.01 : -0.01;
      const newYesPrice = Math.max(0.05, Math.min(0.95, parseFloat(event.yesPrice) + yesAdjustment)).toFixed(4);
      const newNoPrice = (1 - parseFloat(newYesPrice)).toFixed(4);

      await storage.updateEventPrices(eventId, newYesPrice, newNoPrice, newVolume, newPoolSize);

      res.status(201).json({ bet, newBalance });
    } catch (error) {
      console.error("Error placing bet:", error);
      res.status(500).json({ error: "Failed to place bet" });
    }
  });

  // Get user's bets
  app.get("/api/bets/user/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWallet(req.params.walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const bets = await storage.getUserBets(user.id);
      res.json(bets);
    } catch (error) {
      console.error("Error fetching user bets:", error);
      res.status(500).json({ error: "Failed to fetch bets" });
    }
  });

  // ============ LEADERBOARD ============

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // ============ RESOLUTION ============

  // Get current crypto prices
  app.get("/api/prices/:asset", async (req, res) => {
    try {
      const price = await getCryptoPrice(req.params.asset);
      if (price === null) {
        return res.status(404).json({ error: "Asset not found or API error" });
      }
      res.json({ asset: req.params.asset, price, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error fetching price:", error);
      res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  // Manually trigger resolution check
  app.post("/api/resolution/check", async (req, res) => {
    try {
      const count = await checkAndResolveExpiredEvents();
      res.json({ message: `Checked and resolved ${count} events`, resolved: count });
    } catch (error) {
      console.error("Error checking resolution:", error);
      res.status(500).json({ error: "Failed to check resolution" });
    }
  });

  // Resolve a specific event
  app.post("/api/events/:id/resolve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await resolveEvent(id);
      if (success) {
        const event = await storage.getEvent(id);
        res.json({ message: "Event resolved", event });
      } else {
        res.status(400).json({ error: "Could not resolve event (may need manual data or already resolved)" });
      }
    } catch (error) {
      console.error("Error resolving event:", error);
      res.status(500).json({ error: "Failed to resolve event" });
    }
  });

  // Start the resolution cron job (checks every 5 minutes)
  startResolutionCron(5);

  return httpServer;
}
