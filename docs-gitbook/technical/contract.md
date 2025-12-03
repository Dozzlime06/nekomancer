# Smart Contract

All protocol logic lives on-chain. No backend servers for trading.

---

## Contract Address

```
0xB55bf66Ba4eE488Cedb5EE49bfe4Edaf2F54b022
```

Network: Monad Mainnet
Chain ID: 143

---

## Verified Source

Contract is verified on MonadVision:

```
https://monadvision.com/address/0xB55bf66Ba4eE488Cedb5EE49bfe4Edaf2F54b022
```

---

## Architecture

The contract uses UUPS (Universal Upgradeable Proxy Standard).

Components:
- **Proxy** — Entry point, holds state
- **Implementation** — Logic, can be upgraded
- **Admin** — Controls upgrades (multisig)

See [Upgradeability](upgrades.md) for details.

---

## Dependencies

### USDC Token

```
0x754704Bc059F8C67012fEd69BC8A327a5aafb603
```

All deposits, trades, and payouts use this USDC contract.

---

## Key Constants

```solidity
uint256 public constant PLATFORM_FEE = 200; // 2% (basis points)
uint256 public constant INITIAL_LIQUIDITY = 50e6; // 50 USDC per side
uint256 public constant PROPOSAL_BOND = 5e6; // 5 USDC
uint256 public constant CHALLENGE_BOND = 10e6; // 10 USDC
uint256 public constant CHALLENGE_PERIOD = 24 hours;
uint256 public constant RESOLUTION_TIMEOUT = 7 days;
```

---

## State Variables

```solidity
mapping(uint256 => Market) public markets;
mapping(address => uint256) public balances;
mapping(uint256 => mapping(address => Position)) public positions;
uint256 public marketCount;
address public treasury;
```

---

## Reading State

You can read all contract state directly:

```javascript
// Get market info
const market = await contract.markets(marketId);

// Get user balance
const balance = await contract.balances(userAddress);

// Get user position
const position = await contract.positions(marketId, userAddress);
```
