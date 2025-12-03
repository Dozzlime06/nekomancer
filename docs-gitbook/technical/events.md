# Events

On-chain events for tracking activity.

---

## Market Events

### MarketCreated

```solidity
event MarketCreated(
    uint256 indexed marketId,
    string question,
    string category,
    uint256 deadline,
    address creator
);
```

Emitted when a new market is created.

### MarketResolved

```solidity
event MarketResolved(
    uint256 indexed marketId,
    bool outcome,
    address resolver
);
```

Emitted when a market outcome is finalized.

---

## Trading Events

### SharesPurchased

```solidity
event SharesPurchased(
    uint256 indexed marketId,
    address indexed buyer,
    bool isYes,
    uint256 amount,
    uint256 shares,
    uint256 price
);
```

Emitted on every share purchase.

### SharesSold

```solidity
event SharesSold(
    uint256 indexed marketId,
    address indexed seller,
    bool isYes,
    uint256 shares,
    uint256 amount,
    uint256 price
);
```

Emitted when shares are sold.

---

## Balance Events

### Deposited

```solidity
event Deposited(
    address indexed user,
    uint256 amount
);
```

### Withdrawn

```solidity
event Withdrawn(
    address indexed user,
    uint256 amount
);
```

### WinningsClaimed

```solidity
event WinningsClaimed(
    uint256 indexed marketId,
    address indexed user,
    uint256 amount
);
```

---

## Resolution Events

### OutcomeProposed

```solidity
event OutcomeProposed(
    uint256 indexed marketId,
    bool outcome,
    address proposer,
    uint256 bond
);
```

### OutcomeChallenged

```solidity
event OutcomeChallenged(
    uint256 indexed marketId,
    bool newOutcome,
    address challenger,
    uint256 bond
);
```

### OutcomeFinalized

```solidity
event OutcomeFinalized(
    uint256 indexed marketId,
    bool outcome
);
```

---

## Listening to Events

```javascript
// Listen for new markets
contract.on("MarketCreated", (marketId, question, category, deadline, creator) => {
    console.log(`New market: ${question}`);
});

// Listen for trades
contract.on("SharesPurchased", (marketId, buyer, isYes, amount, shares, price) => {
    console.log(`${buyer} bought ${shares} ${isYes ? 'YES' : 'NO'} shares`);
});
```
