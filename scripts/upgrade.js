const hre = require("hardhat");

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;
  
  if (!PROXY_ADDRESS) {
    console.error("Please set PROXY_ADDRESS environment variable");
    process.exit(1);
  }
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Upgrading with:", deployer.address);
  console.log("Proxy address:", PROXY_ADDRESS);
  
  // 1. Deploy new implementation (e.g., PredictionMarketV2)
  console.log("\n1. Deploying new implementation...");
  const NewImplementation = await hre.ethers.getContractFactory("PredictionMarketV1"); // Change to V2
  const newImpl = await NewImplementation.deploy();
  await newImpl.waitForDeployment();
  const newImplAddress = await newImpl.getAddress();
  console.log("New implementation deployed to:", newImplAddress);
  
  // 2. Upgrade proxy
  console.log("\n2. Upgrading proxy...");
  const proxy = await hre.ethers.getContractAt("PredictionMarketProxy", PROXY_ADDRESS);
  const tx = await proxy.upgradeTo(newImplAddress);
  await tx.wait();
  console.log("Proxy upgraded!");
  
  // 3. Verify
  console.log("\n3. Verifying upgrade...");
  const market = await hre.ethers.getContractAt("PredictionMarketV1", PROXY_ADDRESS);
  const version = await market.getVersion();
  console.log("New version:", version);
  
  console.log("\n=== Upgrade Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Upgrade failed:", error);
    process.exit(1);
  });
