const hre = require("hardhat");

async function main() {
  const USDC_ADDRESS = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with:", deployer.address);
  console.log("USDC Address:", USDC_ADDRESS);
  
  // 1. Deploy Implementation
  console.log("\n1. Deploying PredictionMarketV1 implementation...");
  const PredictionMarketV1 = await hre.ethers.getContractFactory("PredictionMarketV1");
  const implementation = await PredictionMarketV1.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log("Implementation deployed to:", implAddress);
  
  // 2. Encode initialize call
  const initData = implementation.interface.encodeFunctionData("initialize", [
    USDC_ADDRESS,
    deployer.address
  ]);
  
  // 3. Deploy Proxy
  console.log("\n2. Deploying Proxy...");
  const PredictionMarketProxy = await hre.ethers.getContractFactory("PredictionMarketProxy");
  const proxy = await PredictionMarketProxy.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("Proxy deployed to:", proxyAddress);
  
  // 4. Verify
  console.log("\n3. Verifying deployment...");
  const market = PredictionMarketV1.attach(proxyAddress);
  const version = await market.getVersion();
  const owner = await market.owner();
  console.log("Contract version:", version);
  console.log("Contract owner:", owner);
  
  console.log("\n=== Deployment Complete ===");
  console.log("Proxy Address (use this):", proxyAddress);
  console.log("Implementation Address:", implAddress);
  console.log("\nSettings:");
  console.log("- Creator Fee: 2%");
  console.log("- Proposal Bond: 5 USDC");
  console.log("- Challenge Bond: 10 USDC");
  console.log("- Challenge Window: 24 hours");
  console.log("- Auto-Void Timeout: 7 days");
  
  return { proxyAddress, implAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
