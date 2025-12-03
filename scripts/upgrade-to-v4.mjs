import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROXY_ADDRESS = "0x256f33EB879264679460Df8Ba0eAb96738bCec9B";
const RPC_URL = "https://rpc.monad.xyz";

const PROXY_ABI = [
  "function upgradeTo(address newImplementation) external",
  "function getImplementation() external view returns (address)",
  "function owner() external view returns (address)",
  "function getVersion() external view returns (string)",
  "function migrateToV4(address[] calldata users, uint256[] calldata marketIds) external",
  "function setMigrated(bool _migrated) external",
  "function migrated() external view returns (bool)"
];

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deployer:", wallet.address);

  // Compile V4 contract
  console.log("\n1. Compiling V4 contract...");
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const solc = require('solc');
  
  const contractPath = path.join(__dirname, '..', 'contracts', 'PredictionMarketV4UUPS.sol');
  const interfacePath = path.join(__dirname, '..', 'contracts', 'interfaces', 'IERC20.sol');
  
  const sources = {
    'PredictionMarketV4UUPS.sol': { content: fs.readFileSync(contractPath, 'utf8') },
    'interfaces/IERC20.sol': { content: fs.readFileSync(interfacePath, 'utf8') }
  };

  const input = {
    language: 'Solidity',
    sources: sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error("Compilation errors:", errors);
      process.exit(1);
    }
  }

  const contractOutput = output.contracts['PredictionMarketV4UUPS.sol']['PredictionMarketV4UUPS'];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;

  console.log("V4 Contract compiled successfully!");

  // Deploy new implementation
  console.log("\n2. Deploying V4 implementation...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const implementation = await factory.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log("V4 Implementation deployed at:", implAddress);

  // Get current state from proxy
  const proxy = new ethers.Contract(PROXY_ADDRESS, PROXY_ABI, wallet);
  const currentImpl = await proxy.getImplementation();
  const currentOwner = await proxy.owner();
  console.log("\n3. Current state:");
  console.log("   Current implementation:", currentImpl);
  console.log("   Owner:", currentOwner);
  
  if (currentOwner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error("ERROR: You are not the owner of this proxy!");
    console.log("   Your address:", wallet.address);
    console.log("   Owner address:", currentOwner);
    process.exit(1);
  }

  // Upgrade to V4
  console.log("\n4. Upgrading proxy to V4...");
  const upgradeTx = await proxy.upgradeTo(implAddress);
  await upgradeTx.wait();
  console.log("Upgrade complete! Tx:", upgradeTx.hash);

  // Verify upgrade
  const newImpl = await proxy.getImplementation();
  console.log("New implementation:", newImpl);
  
  try {
    const version = await proxy.getVersion();
    console.log("Contract version:", version);
  } catch (e) {
    console.log("Could not get version (may need to call from new ABI)");
  }

  // Save deployment info
  const deploymentInfo = {
    network: "monad-mainnet",
    chainId: 143,
    proxyAddress: PROXY_ADDRESS,
    oldImplementation: currentImpl,
    newImplementation: implAddress,
    version: "V4-18DEC",
    upgradedAt: new Date().toISOString(),
    upgradeHash: upgradeTx.hash,
    notes: "Upgraded to 18-decimal support with migration function"
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'deployment-v4.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment-v4.json");

  console.log("\n=== NEXT STEPS ===");
  console.log("1. Run migration with: npx tsx scripts/migrate-v4.mjs");
  console.log("2. This will scale existing positions and reset pools");
  console.log("3. After migration, users can continue using the platform");
}

main().catch(console.error);
