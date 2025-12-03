import { ethers } from "ethers";
import * as fs from "fs";

const USDC_ADDRESS = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
const RPC_URL = "https://rpc.monad.xyz";

async function main() {
  console.log("🚀 Deploying PredictionMarket with TRUE UUPS pattern...\n");
  
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set");
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deployer:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "MON\n");
  
  const compiled = JSON.parse(fs.readFileSync("compiled_uups.json", "utf8"));
  
  const implContract = compiled.contracts["contracts/PredictionMarketV2UUPS.sol:PredictionMarketV2UUPS"];
  const proxyContract = compiled.contracts["contracts/UUPSProxy.sol:UUPSProxy"];
  
  const implAbi = typeof implContract.abi === 'string' ? JSON.parse(implContract.abi) : implContract.abi;
  const implBytecode = implContract.bin.startsWith("0x") ? implContract.bin : "0x" + implContract.bin;
  const proxyAbi = typeof proxyContract.abi === 'string' ? JSON.parse(proxyContract.abi) : proxyContract.abi;
  const proxyBytecode = proxyContract.bin.startsWith("0x") ? proxyContract.bin : "0x" + proxyContract.bin;
  
  console.log("1️⃣ Deploying Implementation...");
  const ImplFactory = new ethers.ContractFactory(implAbi, implBytecode, wallet);
  const implementation = await ImplFactory.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log("   Implementation:", implAddress);
  
  console.log("\n2️⃣ Deploying UUPS Proxy...");
  const iface = new ethers.Interface(implAbi);
  const initData = iface.encodeFunctionData("initialize", [USDC_ADDRESS, wallet.address]);
  
  const ProxyFactory = new ethers.ContractFactory(proxyAbi, proxyBytecode, wallet);
  const proxy = await ProxyFactory.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("   Proxy:", proxyAddress);
  
  console.log("\n3️⃣ Verifying...");
  const market = new ethers.Contract(proxyAddress, implAbi, wallet);
  const version = await market.getVersion();
  const owner = await market.owner();
  const usdc = await market.usdc();
  const treasury = await market.getTreasury();
  const storedImpl = await market.getImplementation();
  
  console.log("   Version:", version);
  console.log("   Owner:", owner);
  console.log("   USDC:", usdc);
  console.log("   Treasury:", treasury);
  console.log("   Stored Implementation:", storedImpl);
  
  console.log("\n✅ UUPS DEPLOYMENT SUCCESSFUL!");
  console.log("=====================================");
  console.log("Proxy Address (USE THIS):", proxyAddress);
  console.log("Implementation Address:", implAddress);
  console.log("=====================================");
  console.log("\nUUPS Features:");
  console.log("- Upgrade logic in IMPLEMENTATION (not proxy)");
  console.log("- Only owner can upgrade via upgradeTo()");
  console.log("- Minimal proxy (just delegation)");
  console.log("\nSettings:");
  console.log("- USDC:", USDC_ADDRESS);
  console.log("- Platform Fee: 2% → Treasury");
  console.log("- Treasury:", "0xE9059B5f1C60ecf9C1F07ac2bBa148A75394f56e");
  console.log("- Proposal Bond: 5 USDC");
  console.log("- Challenge Bond: 10 USDC");
  console.log("- Challenge Window: 24 hours");
  
  const deploymentInfo = {
    network: "monad-mainnet",
    chainId: 143,
    proxyAddress,
    implementationAddress: implAddress,
    proxyType: "UUPS",
    usdc: USDC_ADDRESS,
    treasury: "0xE9059B5f1C60ecf9C1F07ac2bBa148A75394f56e",
    owner: wallet.address,
    version: "2.0.0-UUPS",
    deployedAt: new Date().toISOString()
  };
  
  fs.writeFileSync("deployment-uups.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 Deployment info saved to deployment-uups.json");
}

main().catch(console.error);
