import { ethers } from "ethers";
import * as fs from "fs";

const PROXY_ADDRESS = "0x0118B45105e06e9696bF8959ff3115e3F505D44C";
const RPC_URL = "https://rpc.monad.xyz";

async function main() {
  console.log("🚀 Upgrading to PredictionMarket V3...\n");
  
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set");
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deployer:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "MON\n");
  
  const compiled = JSON.parse(fs.readFileSync("compiled_v3.json", "utf8"));
  
  const implContract = compiled.contracts["contracts/PredictionMarketV3UUPS.sol:PredictionMarketV3UUPS"];
  const implAbi = typeof implContract.abi === 'string' ? JSON.parse(implContract.abi) : implContract.abi;
  const implBytecode = implContract.bin.startsWith("0x") ? implContract.bin : "0x" + implContract.bin;
  
  console.log("1️⃣ Deploying V3 Implementation...");
  const ImplFactory = new ethers.ContractFactory(implAbi, implBytecode, wallet);
  const implementation = await ImplFactory.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log("   V3 Implementation:", implAddress);
  
  console.log("\n2️⃣ Upgrading Proxy to V3...");
  const proxyAbi = [
    "function upgradeTo(address newImplementation)",
    "function getVersion() view returns (string)",
    "function getImplementation() view returns (address)",
    "function owner() view returns (address)"
  ];
  
  const proxy = new ethers.Contract(PROXY_ADDRESS, proxyAbi, wallet);
  
  const currentOwner = await proxy.owner();
  console.log("   Current owner:", currentOwner);
  console.log("   Wallet address:", wallet.address);
  
  if (currentOwner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("Not the owner of the proxy");
  }
  
  const tx = await proxy.upgradeTo(implAddress);
  await tx.wait();
  console.log("   Upgrade tx:", tx.hash);
  
  console.log("\n3️⃣ Verifying...");
  const market = new ethers.Contract(PROXY_ADDRESS, implAbi, wallet);
  const version = await market.getVersion();
  const storedImpl = await market.getImplementation();
  
  console.log("   Version:", version);
  console.log("   Stored Implementation:", storedImpl);
  
  console.log("\n✅ UPGRADE TO V3 SUCCESSFUL!");
  console.log("=====================================");
  console.log("Proxy Address (unchanged):", PROXY_ADDRESS);
  console.log("New Implementation:", implAddress);
  console.log("Version:", version);
  console.log("=====================================");
  console.log("\nV3 Fixes:");
  console.log("- FIXED: AMM CPMM logic now correct");
  console.log("- FIXED: Platform fee deducted before AMM calculation");
  console.log("- Shares calculated correctly from pool changes");
  
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-uups.json", "utf8"));
  deploymentInfo.v3ImplementationAddress = implAddress;
  deploymentInfo.currentVersion = "3.0.0-UUPS";
  deploymentInfo.upgradedAt = new Date().toISOString();
  
  fs.writeFileSync("deployment-uups.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 Deployment info updated");
}

main().catch(console.error);
