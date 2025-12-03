# Security

How we keep your funds safe.

---

## Self-Custody

Your funds are yours. The contract holds deposits, but only you can withdraw.

No admin can:
- Take your funds
- Freeze your account
- Prevent withdrawals

---

## Smart Contract Security

### Verified Code

Contract source is verified on MonadVision. Read it yourself.

```
0xB55bf66Ba4eE488Cedb5EE49bfe4Edaf2F54b022
```

### UUPS Proxy

Upgrades are possible but controlled:

- 3-of-5 multisig required
- 48-hour timelock
- Public announcement before execution

### Reentrancy Protection

All external calls follow checks-effects-interactions. State updates before transfers.

### Access Controls

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}
```

Critical functions restricted to multisig.

---

## Known Risks

### Smart Contract Risk

All DeFi has contract risk. Bugs can cause loss of funds. Only deposit what you can afford to lose.

### Oracle Risk

Resolution depends on correct proposals and challenges. Malicious actors could propose wrong outcomes. The bond system deters this but doesn't eliminate it.

### AMM Slippage

Large trades move prices. You might get worse execution than expected. Always check the quote before confirming.

### Upgrade Risk

Contract can be upgraded. Malicious upgrades could theoretically steal funds. Mitigated by multisig + timelock + public signers.

---

## USDC Allowances

When you deposit, you approve USDC spending.

Best practice:
- Approve exact amount, not unlimited
- Revoke approval after withdrawing if concerned

Check allowances at [revoke.cash](https://revoke.cash).

---

## Challenge Window Edge Cases

### Window Expiry

If you miss the challenge window, wrong outcomes can finalize. Set reminders for markets you care about.

### Timeout Griefing

Theoretically someone could keep challenging to delay resolution. Bond escalation makes this expensive. After 7 days, market voids.

---

## Recommendations

1. **Start small** — Test with small amounts first
2. **Verify addresses** — Always check you're on the right contract
3. **Monitor positions** — Watch for resolution proposals
4. **Diversify** — Don't put everything in one market
5. **Understand the risks** — Read this page before depositing

---

## Reporting Issues

Found a bug? Security vulnerability?

Contact: security@nekomancer.xyz

Responsible disclosure appreciated. Bounties available for critical issues.
