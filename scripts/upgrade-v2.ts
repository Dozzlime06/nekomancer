import { ethers } from "ethers";
import * as fs from "fs";

const PROXY_ADDRESS = "0x8A15A75501D49F44A4c2c6f0803a01534f0E3fCe";
const RPC_URL = "https://rpc.monad.xyz";

async function main() {
  console.log("🚀 Upgrading PredictionMarket to V2...\n");
  
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set");
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Upgrader:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "MON\n");
  
  const compiled = JSON.parse(fs.readFileSync("compiled_v2.json", "utf8"));
  
  const v2Contract = compiled.contracts["contracts/PredictionMarketV2.sol:PredictionMarketV2"];
  const proxyContract = compiled.contracts["contracts/PredictionMarketProxy.sol:PredictionMarketProxy"];
  
  const v2Abi = typeof v2Contract.abi === 'string' ? JSON.parse(v2Contract.abi) : v2Contract.abi;
  const v2Bytecode = v2Contract.bin.startsWith("0x") ? v2Contract.bin : "0x" + v2Contract.bin;
  const proxyAbi = typeof proxyContract.abi === 'string' ? JSON.parse(proxyContract.abi) : proxyContract.abi;
  
  console.log("1️⃣ Deploying V2 Implementation...");
  const V2Factory = new ethers.ContractFactory(v2Abi, v2Bytecode, wallet);
  const v2Implementation = await V2Factory.deploy();
  await v2Implementation.waitForDeployment();
  const v2Address = await v2Implementation.getAddress();
  console.log("   V2 Implementation:", v2Address);
  
  console.log("\n2️⃣ Upgrading Proxy...");
  const proxy = new ethers.Contract(PROXY_ADDRESS, proxyAbi, wallet);
  const upgradeTx = await proxy.upgradeTo(v2Address);
  await upgradeTx.wait();
  console.log("   Upgrade TX:", upgradeTx.hash);
  
  console.log("\n3️⃣ Initializing V2...");
  const market = new ethers.Contract(PROXY_ADDRESS, v2Abi, wallet);
  try {
    const initTx = await market.initializeV2();
    await initTx.wait();
    console.log("   Init V2 TX:", initTx.hash);
  } catch (e: any) {
    console.log("   V2 already initialized or not needed");
  }
  
  console.log("\n4️⃣ Verifying...");
  const version = await market.getVersion();
  const treasury = await market.getTreasury();
  const owner = await market.owner();
  
  console.log("   Version:", version);
  console.log("   Treasury:", treasury);
  console.log("   Owner:", owner);
  
  console.log("\n✅ UPGRADE SUCCESSFUL!");
  console.log("=====================================");
  console.log("Proxy Address:", PROXY_ADDRESS);
  console.log("New Implementation:", v2Address);
  console.log("Treasury:", treasury);
  console.log("=====================================");
  console.log("\nV2 Changes:");
  console.log("- Platform Fee: 2% goes to Treasury");
  console.log("- No Creator Fee");
  console.log("- Treasury:", "0xE9059B5f1C60ecf9C1F07ac2bBa148A75394f56e");
  
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  deploymentInfo.v2ImplementationAddress = v2Address;
  deploymentInfo.treasury = treasury;
  deploymentInfo.upgradedAt = new Date().toISOString();
  deploymentInfo.version = "2.0.0";
  
  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 Deployment info updated");
}

main().catch(console.error);
