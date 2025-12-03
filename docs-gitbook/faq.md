# FAQ

Common questions answered.

---

## General

### What is Nekomancer?

A prediction market protocol on Monad. You bet on future events by buying shares. If you're right, you win money. If you're wrong, you lose.

### Is this gambling?

Prediction markets are distinct from gambling. You're trading on information and probabilities, not random chance. However, you can still lose money. Trade responsibly.

### What blockchain is this on?

Monad mainnet. Chain ID 143.

### Why Monad?

Fast blocks, cheap gas, EVM compatible. Good for frequent trading.

---

## Trading

### What's the minimum trade?

No minimum. Trade any amount. But gas costs make tiny trades impractical.

### How do prices work?

Prices reflect market probability. A YES share at $0.70 means the market thinks there's ~70% chance of YES.

Prices move based on supply and demand through the AMM.

### Can I lose more than I invest?

No. Maximum loss is your initial investment. No leverage, no margin calls.

### Can I sell before resolution?

Yes. Sell anytime at current market price. You don't have to wait.

---

## Wallet & Funds

### What wallet do I need?

Any EVM wallet. MetaMask, Coinbase Wallet, Rainbow, Rabby, etc.

### Is my money safe?

Your funds are in the smart contract, not on our servers. Only you control withdrawals. But smart contracts have risks — use money you can afford to lose.

### How do I withdraw?

Go to Wallet → Withdraw → Enter amount → Confirm transaction. USDC goes directly to your wallet.

### Where do my funds go when I deposit?

Into the smart contract at `0xB55bf66Ba4eE488Cedb5EE49bfe4Edaf2F54b022`. It's on-chain and auditable.

---

## Resolution

### Who decides the outcome?

Anyone can propose. The bond system ensures correct outcomes win. No admin intervention.

### What if the wrong outcome is proposed?

Challenge it. You'll win the proposer's bond if you're correct.

### What if an event is ambiguous?

Markets with no clear resolution get voided. Everyone gets refunded.

### How long until I can claim winnings?

24 hours after the outcome is proposed (assuming no challenges). Then claim anytime.

---

## Fees

### How much are fees?

2% on every trade. That's it.

### Where do fees go?

Protocol treasury. Used for development, security, and community.

### Are there gas fees?

Yes, paid in MON for every transaction. Monad gas is cheap.

---

## Technical

### Is the contract audited?

[Audit status]

### Is the contract upgradeable?

Yes, via UUPS proxy. Controlled by multisig with timelock.

### Can I verify the contract?

Yes. Verified on MonadVision. Check the code yourself.

### Where's the source code?

GitHub: [github.com/Dozzlime06/nekomancer](https://github.com/Dozzlime06/nekomancer)
