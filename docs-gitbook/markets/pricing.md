# Pricing & AMM

Nekomancer uses a Constant Product Market Maker (CPMM) for pricing.

---

## How Prices Work

Each market has two liquidity pools:

- YES pool (starts at 50 USDC equivalent)
- NO pool (starts at 50 USDC equivalent)

The product of the pools stays constant:

```
YES_pool × NO_pool = k (constant)
```

When you buy YES shares, the YES pool shrinks and the NO pool grows. This pushes the YES price up and NO price down.

---

## Price Formula

```
YES_price = NO_pool / (YES_pool + NO_pool)
NO_price = YES_pool / (YES_pool + NO_pool)
```

YES + NO prices always equal $1.00.

---

## Slippage

Large trades move prices. This is called slippage.

Example with pools at 50/50:

| Trade Size | Price Impact |
|------------|--------------|
| 1 USDC | ~2% |
| 5 USDC | ~9% |
| 10 USDC | ~17% |
| 25 USDC | ~33% |

Smaller trades = better prices. Split large orders if needed.

---

## Initial Liquidity

Every new market starts with 50 USDC worth of shares on each side, funded by the market creator.

This ensures markets always have liquidity from the start.

---

## Shares Received

The shares you receive depend on the price at execution:

```
shares = amount / execution_price
```

The execution price is worse than the quoted price due to slippage. The UI shows your expected shares before you confirm.

---

## Arbitrage

If external events change the true probability, traders can profit by buying underpriced shares. This moves prices toward the "correct" probability.

Markets with more volume tend to have more accurate prices.
