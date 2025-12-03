# How Markets Work

Every market is a question with two possible outcomes: YES or NO.

---

## The Basics

1. Someone creates a market with a question and deadline
2. Traders buy YES or NO shares
3. Prices move based on supply and demand
4. After the deadline, the outcome is proposed and finalized
5. Winning shares pay $1.00 each

---

## Shares and Prices

Each market has two share types:

- **YES shares** — Pay $1 if outcome is YES
- **NO shares** — Pay $1 if outcome is NO

Prices range from $0.01 to $0.99. A share priced at $0.70 means the market thinks there's a ~70% chance that side wins.

---

## Example

**Market:** "Will ETH be above $5,000 on Dec 31?"

- Current YES price: $0.35
- Current NO price: $0.65

You think ETH will moon. You buy 100 YES shares at $0.35 = $35 total.

**If ETH is above $5,000:**
- Your 100 shares are worth $100
- Profit: $65

**If ETH is below $5,000:**
- Your shares are worth $0
- Loss: $35

---

## Price Movement

Prices change when people trade. More buying pressure = higher price.

The AMM (automated market maker) sets prices using a constant product formula. Large trades move prices more than small trades.

---

## Selling Before Resolution

You don't have to wait for resolution. Sell anytime at the current market price.

If you bought YES at $0.35 and it rises to $0.60, sell for profit without waiting.

---

## Resolution

After the deadline:

1. Anyone can propose the outcome
2. 24-hour challenge period
3. If no challenge → outcome is final
4. Winners claim their payouts

See [Oracle System](../resolution/oracle.md) for details.
