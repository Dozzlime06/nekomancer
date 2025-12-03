import { ethers } from "ethers";

const USDC_ADDRESS = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
const RPC_URL = "https://rpc.monad.xyz";

// Contract bytecode and ABI (compiled)
const PredictionMarketV1 = {
  abi: [
    "function initialize(address _usdc, address _owner) public",
    "function getVersion() external pure returns (string memory)",
    "function owner() external view returns (address)",
    "function usdc() external view returns (address)",
    "function deposit(uint256 amount) external",
    "function withdraw(uint256 amount) external",
    "function createMarket(string calldata question, uint256 deadline, string calldata targetAsset, uint256 targetPrice, bool priceAbove) external returns (uint256)",
    "function buyShares(uint256 marketId, bool isYes, uint256 amount) external",
    "function proposeOutcome(uint256 marketId, uint256 currentPrice) external",
    "function challengeOutcome(uint256 marketId, uint256 correctPrice) external",
    "function finalizeResolution(uint256 marketId) external",
    "function claimWinnings(uint256 marketId) external",
    "function getMarket(uint256 marketId) external view returns (tuple(uint256 id, address creator, string question, uint8 category, uint256 deadline, uint8 status, uint8 outcome, uint256 yesPool, uint256 noPool, uint256 totalVolume, string targetAsset, uint256 targetPrice, bool priceAbove, uint256 resolvedPrice, uint256 resolvedAt))",
    "function getUserBalance(address user) external view returns (uint256)",
    "function getPrice(uint256 marketId, bool isYes) public view returns (uint256)"
  ]
};

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
  
  // Read compiled bytecode
  const fs = await import("fs");
  const path = await import("path");
  
  // Check if artifacts exist
  const artifactPath = path.join(process.cwd(), "artifacts/contracts/PredictionMarketV1.sol/PredictionMarketV1.json");
  
  if (!fs.existsSync(artifactPath)) {
    console.log("❌ Contract not compiled. Please compile first with:");
    console.log("   npx hardhat compile --config hardhat.config.cjs");
    process.exit(1);
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode;
  
  // Deploy Implementation
  console.log("1️⃣ Deploying Implementation...");
  const ImplFactory = new ethers.ContractFactory(artifact.abi, bytecode, wallet);
  const implementation = await ImplFactory.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log("   Implementation:", implAddress);
  
  // Deploy Proxy
  console.log("\n2️⃣ Deploying Proxy...");
  const proxyArtifactPath = path.join(process.cwd(), "artifacts/contracts/PredictionMarketProxy.sol/PredictionMarketProxy.json");
  const proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, "utf8"));
  
  // Encode initialize call
  const iface = new ethers.Interface(artifact.abi);
  const initData = iface.encodeFunctionData("initialize", [USDC_ADDRESS, wallet.address]);
  
  const ProxyFactory = new ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode, wallet);
  const proxy = await ProxyFactory.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("   Proxy:", proxyAddress);
  
  // Verify
  console.log("\n3️⃣ Verifying...");
  const market = new ethers.Contract(proxyAddress, artifact.abi, wallet);
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
  
  // Save deployment info
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
