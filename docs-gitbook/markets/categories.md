# Market Categories

Nekomancer supports four market types.

---

## Crypto

Price predictions for cryptocurrencies.

**Examples:**
- "BTC above $100,000 by Dec 31, 2025?"
- "ETH flips BTC market cap in 2025?"
- "SOL hits new ATH this month?"

Resolution uses on-chain price feeds or CoinGecko data at the specified deadline.

---

## Sports

Game outcomes and championships.

**Examples:**
- "Lakers win NBA Finals 2025?"
- "Manchester City wins Premier League?"
- "Super Bowl winner: Chiefs or Eagles?"

Resolution uses official league results.

---

## Politics

Elections and political events.

**Examples:**
- "Will X win the 2028 election?"
- "New Fed chair appointed by June?"
- "Government shutdown in Q4?"

Resolution based on official announcements and verified news sources.

---

## Pop Culture

Entertainment, media, and cultural events.

**Examples:**
- "Movie X breaks $1B box office?"
- "Album drops before summer?"
- "Celebrity couple splits in 2025?"

Resolution uses reliable news sources and official announcements.

---

## Creating Markets

Anyone can create a market in any category. See [Smart Contract](../technical/contract.md) for the `createMarket` function.

Market creators set:
- Question text
- Category
- Deadline
- Resolution source (where to check the answer)
