# Monad Markets Smart Contracts

## Overview

Fully decentralized prediction market contracts for Monad blockchain.

## Contract: PredictionMarket.sol

### Settings
| Parameter | Value |
|-----------|-------|
| USDC Contract | 0x754704Bc059F8C67012fEd69BC8A327a5aafb603 |
| Creator Fee | 2% of volume |
| Proposal Bond | 5 USDC |
| Challenge Bond | 10 USDC |
| Challenge Window | 24 hours |
| Auto-Void Timeout | 7 days |
| Min Bet | No minimum |

## Resolution Flow (100% Trustless, No Admin)

```
1. Market Created
   - Creator sets: question, targetAsset, targetPrice, priceAbove, deadline
   - Example: "Will BTC hit $100k?" / bitcoin / 100000 / true / Dec 31

2. Trading Phase
   - Users deposit USDC to contract
   - Users buy YES or NO shares via AMM
   - Price adjusts based on demand
   - 2% fee to creator

3. After Deadline - Permissionless Resolution
   a) ANYONE can propose outcome:
      - Submit current price + stake 5 USDC bond
      - Contract calculates: price >= target ? YES : NO
   
   b) 24-hour challenge window:
      - If price wrong, anyone challenges with 10 USDC
      - Submit correct price
   
   c) Finalize:
      - No challenge → proposer gets bond back
      - Higher bond wins → winner takes all bonds

4. Auto-Void
   - If no proposal after 7 days → market voided
   - All users refunded

5. Claim Winnings
   - Winners: 1 USDC per winning share
   - Losers: 0
   - Voided: refund
```

## Key Functions

```solidity
// Deposit/Withdraw
deposit(uint256 amount)
withdraw(uint256 amount)

// Trading
createMarket(question, deadline, targetAsset, targetPrice, priceAbove)
buyShares(marketId, isYes, amount)

// Resolution (anyone can call)
proposeOutcome(marketId, currentPrice)  // stake 5 USDC
challengeOutcome(marketId, correctPrice) // stake 10 USDC
finalizeResolution(marketId)
voidMarket(marketId)

// Claim
claimWinnings(marketId)
```

## Deploy to Monad

```bash
# Set private key
export PRIVATE_KEY=your_private_key

# Deploy
npx hardhat run scripts/deploy.js --network monad
```

## Trustless Features

✅ No admin address  
✅ No centralized oracle  
✅ Anyone can propose/challenge  
✅ Economic incentives for truth  
✅ Auto-void on timeout  
✅ All funds in contract (not custodied)
