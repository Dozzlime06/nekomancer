# Oracle System

No admin keys. No trusted oracles. Fully permissionless resolution.

---

## How It Works

1. Market deadline passes
2. Anyone can propose the outcome (YES or NO)
3. 24-hour challenge window opens
4. If no challenge → outcome finalizes
5. If challenged → new 24-hour round begins
6. After 3 rounds or 7 days → market is voided if unresolved

---

## Why Permissionless?

Traditional prediction markets rely on trusted oracles or admin multisigs. They can:
- Delay payouts
- Resolve incorrectly (intentionally or not)
- Censor markets

Nekomancer's bond-based system makes correct resolution the economically rational choice.

---

## The Incentive

Proposers and challengers put up bonds:

| Role | Bond Amount |
|------|-------------|
| Proposer | 5 USDC |
| Challenger | 10 USDC |

If you propose correctly and no one challenges, you get your bond back.

If you propose incorrectly and someone challenges, they get your bond. The correct outcome wins.

---

## Resolution Sources

Each market has a defined resolution source:

- **Crypto:** CoinGecko price at deadline timestamp
- **Sports:** Official league/federation results
- **Politics:** Official government announcements
- **Pop Culture:** Verified news from major outlets

The source is visible on each market page before you trade.

---

## Edge Cases

**What if the event is ambiguous?**

Markets with genuinely unclear outcomes get voided. All traders receive refunds proportional to their positions.

**What if nobody proposes?**

After 7 days with no proposal, the market is voided.

**What if challengers keep griefing?**

Challenge bonds double each round. Griefing becomes expensive fast.
