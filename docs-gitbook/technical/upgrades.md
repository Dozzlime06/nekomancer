# Upgradeability

The contract uses UUPS proxy pattern for safe upgrades.

---

## What is UUPS?

Universal Upgradeable Proxy Standard. The upgrade logic lives in the implementation contract, not the proxy.

Benefits:
- Cheaper deployment
- Upgrade logic can be removed permanently
- More gas efficient

---

## How It Works

```
User → Proxy → Implementation
         ↓
       State
```

- **Proxy** holds all state (balances, markets, positions)
- **Implementation** holds all logic
- Upgrades replace implementation, keep state

---

## Current Implementation

```
Proxy: 0xB55bf66Ba4eE488Cedb5EE49bfe4Edaf2F54b022
Implementation: [check on-chain]
```

---

## Upgrade Process

1. New implementation deployed
2. Multisig proposes upgrade
3. Timelock period (48 hours)
4. Multisig executes upgrade
5. Proxy points to new implementation

---

## Governance

Upgrades controlled by multisig:

- 3-of-5 threshold
- 48-hour timelock
- Public signers

No single person can upgrade unilaterally.

---

## Safety Measures

### Storage Layout

New implementations must maintain storage layout:

```solidity
// Slot 0: marketCount
// Slot 1: treasury
// Slot 2+: mappings
```

Changing layout = corrupted state.

### Initializers

```solidity
function initialize(address _treasury, address _usdc) public initializer {
    __UUPSUpgradeable_init();
    treasury = _treasury;
    usdc = IERC20(_usdc);
}
```

Can only be called once. Prevents re-initialization attacks.

### Authorization

```solidity
function _authorizeUpgrade(address) internal override onlyOwner {}
```

Only owner (multisig) can authorize upgrades.

---

## Renouncing Upgradeability

Future option: renounce upgrade capability permanently.

```solidity
function _authorizeUpgrade(address) internal override {
    revert("Upgrades disabled");
}
```

Once deployed, no more upgrades ever. Full immutability.
