import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROXY_ADDRESS = "0x256f33EB879264679460Df8Ba0eAb96738bCec9B";
const RPC_URL = "https://rpc.monad.xyz";

const V4_ABI = [
  "function setPaused(bool _paused) external",
  "function paused() external view returns (bool)",
  "function voidCorruptedMarkets(uint256[] calldata marketIds) external",
  "function creditUsers(address[] calldata users, uint256[] calldata amounts) external",
  "function clearPositions(address[] calldata users, uint256[] calldata marketIds) external",
  "function resetMarketPools(uint256[] calldata marketIds) external",
  "function setMigrated(bool _migrated) external",
  "function migrated() external view returns (bool)",
  "function owner() external view returns (address)",
  "function getVersion() external view returns (string)",
  "function nextMarketId() external view returns (uint256)",
  "function markets(uint256 id) external view returns (uint256, address, string, uint8, uint256, uint8, uint8, uint256, uint256, uint256, string, uint256, bool, uint256, uint256, string)",
  "function positions(uint256 marketId, address user) external view returns (uint256, uint256)",
  "function userBalances(address user) external view returns (uint256)"
];

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deployer:", wallet.address);

  const contract = new ethers.Contract(PROXY_ADDRESS, V4_ABI, wallet);

  // Check version
  try {
    const version = await contract.getVersion();
    console.log("Contract version:", version);
    if (!version.includes("V4")) {
      console.error("ERROR: Contract is not V4! Please upgrade first with: npx tsx scripts/upgrade-to-v4.mjs");
      process.exit(1);
    }
  } catch (e) {
    console.error("Could not get version. Is the contract upgraded to V4?");
    console.error(e.message);
    process.exit(1);
  }

  // Known users
  const users = [
    "0x0315eCb53F64b7A4bA56bb8A4DAB0D96F0856b60", // Owner
    "0xB04604CCC8B62C660b15cB826c098d2909645DeA", // Market creator with balance
    "0xE9059B5f1C60ecf9C1F07ac2bBa148A75394f56e"  // Treasury
  ];

  // Get markets
  const nextId = await contract.nextMarketId();
  const marketIds = [];
  for (let i = 1; i < Number(nextId); i++) {
    marketIds.push(i);
  }
  console.log("\nMarkets to process:", marketIds);
  console.log("Users to process:", users.length);

  // Show current state
  console.log("\n=== CURRENT STATE ===");
  for (const user of users) {
    try {
      const balance = await contract.userBalances(user);
      if (balance > 0n) {
        console.log(`${user.slice(0, 12)}... balance: ${ethers.formatUnits(balance, 18)} MANCER`);
      }
    } catch (e) {}
  }

  for (const mId of marketIds) {
    try {
      const market = await contract.markets(mId);
      console.log(`\nMarket ${mId}: ${market[2].substring(0, 40)}...`);
      console.log(`  Status: ${['OPEN', 'PENDING', 'RESOLVED', 'VOIDED'][Number(market[5])]}`);
      console.log(`  YES Pool: ${ethers.formatUnits(market[7], 18)} MANCER`);
      console.log(`  NO Pool: ${ethers.formatUnits(market[8], 18)} MANCER`);
      
      for (const user of users) {
        const pos = await contract.positions(mId, user);
        if (pos[0] > 0n || pos[1] > 0n) {
          console.log(`  ${user.slice(0, 12)}... - YES: ${pos[0].toString()}, NO: ${pos[1].toString()}`);
        }
      }
    } catch (e) {
      console.log(`Market ${mId}: error - ${e.message}`);
    }
  }

  // Migration steps
  console.log("\n=== MIGRATION PLAN ===");
  console.log("Step 1: Pause contract");
  console.log("Step 2: Void corrupted markets");
  console.log("Step 3: Clear corrupted positions");
  console.log("Step 4: Reset market pools (for new markets)");
  console.log("Step 5: Mark migrated & unpause");
  console.log("\nUser balances remain INTACT - can withdraw anytime!");
  console.log("\nPress Ctrl+C to cancel, or wait 5 seconds...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 1: Pause
  console.log("\n[1/5] Pausing contract...");
  let tx = await contract.setPaused(true);
  await tx.wait();
  console.log("Paused. Tx:", tx.hash);

  // Step 2: Void markets
  console.log("\n[2/5] Voiding corrupted markets...");
  tx = await contract.voidCorruptedMarkets(marketIds);
  await tx.wait();
  console.log("Markets voided. Tx:", tx.hash);

  // Step 3: Clear positions
  console.log("\n[3/5] Clearing corrupted positions...");
  tx = await contract.clearPositions(users, marketIds);
  await tx.wait();
  console.log("Positions cleared. Tx:", tx.hash);

  // Step 4: Reset pools (optional - only if you want markets to be usable again)
  // For now, we skip this since markets are voided
  console.log("\n[4/5] Skipping pool reset (markets are voided)");

  // Step 5: Mark migrated and unpause
  console.log("\n[5/5] Marking migrated and unpausing...");
  tx = await contract.setMigrated(true);
  await tx.wait();
  console.log("Migrated. Tx:", tx.hash);
  
  tx = await contract.setPaused(false);
  await tx.wait();
  console.log("Unpaused. Tx:", tx.hash);

  // Verify final state
  console.log("\n=== FINAL STATE ===");
  for (const user of users) {
    try {
      const balance = await contract.userBalances(user);
      if (balance > 0n) {
        console.log(`${user.slice(0, 12)}... balance: ${ethers.formatUnits(balance, 18)} MANCER (WITHDRAWABLE)`);
      }
    } catch (e) {}
  }

  console.log("\n✅ Migration complete!");
  console.log("Users can now withdraw their MANCER tokens.");
}

main().catch(console.error);
