# Contract Functions

Complete reference for all public functions.

---

## User Functions

### deposit

Deposit USDC to your trading balance.

```solidity
function deposit(uint256 amount) external
```

- Requires USDC approval first
- Amount in USDC units (6 decimals)

### withdraw

Withdraw USDC from trading balance to wallet.

```solidity
function withdraw(uint256 amount) external
```

- Cannot exceed your balance
- Sent directly to msg.sender

### buyShares

Buy YES or NO shares in a market.

```solidity
function buyShares(uint256 marketId, bool isYes, uint256 amount) external
```

- `isYes`: true for YES, false for NO
- `amount`: USDC to spend (before fees)
- 2% fee deducted automatically

### sellShares

Sell shares back to the AMM.

```solidity
function sellShares(uint256 marketId, bool isYes, uint256 shares) external
```

- Must have enough shares
- Receives USDC at current market price

### claimWinnings

Claim payout from a resolved market.

```solidity
function claimWinnings(uint256 marketId) external
```

- Only works if you hold winning shares
- Adds USDC to your trading balance

---

## Resolution Functions

### proposeOutcome

Propose the outcome of an expired market.

```solidity
function proposeOutcome(uint256 marketId, bool outcome) external
```

- Requires proposal bond (5 USDC from balance)
- `outcome`: true for YES, false for NO
- Starts 24-hour challenge period

### challengeOutcome

Challenge the current proposed outcome.

```solidity
function challengeOutcome(uint256 marketId) external
```

- Requires challenge bond (10 USDC, escalates)
- Flips the proposed outcome
- Resets challenge period

### finalizeOutcome

Finalize outcome after challenge period.

```solidity
function finalizeOutcome(uint256 marketId) external
```

- Anyone can call
- Challenge period must be over
- Distributes bonds to correct proposer

---

## Market Creation

### createMarket

Create a new prediction market.

```solidity
function createMarket(
    string calldata question,
    string calldata category,
    uint256 deadline,
    string calldata resolutionSource
) external
```

- Requires 100 USDC for initial liquidity
- Deadline must be in the future
- Returns new market ID

---

## View Functions

### getMarket

Get full market details.

```solidity
function getMarket(uint256 marketId) external view returns (Market memory)
```

### getPosition

Get user's position in a market.

```solidity
function getPosition(uint256 marketId, address user) external view returns (Position memory)
```

### getPrice

Get current share prices.

```solidity
function getPrice(uint256 marketId) external view returns (uint256 yesPrice, uint256 noPrice)
```

Prices returned in basis points (5000 = $0.50).
