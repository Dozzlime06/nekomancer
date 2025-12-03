import { ethers } from "ethers";
import * as fs from "fs";

const USDC_ADDRESS = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
const RPC_URL = "https://rpc.monad.xyz";

async function main() {
  console.log("🚀 Deploying PredictionMarket to Monad Mainnet...\n");
  
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set");
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deployer:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "MON\n");
  
  if (balance === 0n) {
    throw new Error("Deployer has no MON for gas fees!");
  }
  
  const compiled = JSON.parse(fs.readFileSync("compiled.json", "utf8"));
  
  const implContract = compiled.contracts["contracts/PredictionMarketV1.sol:PredictionMarketV1"];
  const proxyContract = compiled.contracts["contracts/PredictionMarketProxy.sol:PredictionMarketProxy"];
  
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
  
  console.log("\n2️⃣ Deploying Proxy...");
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
  
  console.log("   Version:", version);
  console.log("   Owner:", owner);
  console.log("   USDC:", usdc);
  
  console.log("\n✅ DEPLOYMENT SUCCESSFUL!");
  console.log("=====================================");
  console.log("Proxy Address (USE THIS):", proxyAddress);
  console.log("Implementation Address:", implAddress);
  console.log("=====================================");
  console.log("\nSettings:");
  console.log("- USDC:", USDC_ADDRESS);
  console.log("- Creator Fee: 2%");
  console.log("- Proposal Bond: 5 USDC");
  console.log("- Challenge Bond: 10 USDC");
  console.log("- Challenge Window: 24 hours");
  console.log("- Auto-Void: 7 days");
  
  const deploymentInfo = {
    network: "monad-mainnet",
    chainId: 143,
    proxyAddress,
    implementationAddress: implAddress,
    usdc: USDC_ADDRESS,
    owner: wallet.address,
    deployedAt: new Date().toISOString()
  };
  
  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 Deployment info saved to deployment.json");
}

main().catch(console.error);
