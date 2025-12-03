import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const PROXY_ADDRESS = "0x0118B45105e06e9696bF8959ff3115e3F505D44C";

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("DEPLOYER_PRIVATE_KEY not set");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider("https://rpc.monad.xyz");
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "MON");

  // Read contract source
  const contractSource = readFileSync("contracts/PredictionMarketV3UUPS.sol", "utf8");
  const interfaceSource = readFileSync("contracts/interfaces/IERC20.sol", "utf8");

  // Create input for solc
  const input = {
    language: "Solidity",
    sources: {
      "PredictionMarketV3UUPS.sol": { content: contractSource },
      "interfaces/IERC20.sol": { content: interfaceSource }
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object"] }
      }
    }
  };

  // Write input to file
  writeFileSync("solc-input.json", JSON.stringify(input));
  
  // Try to compile using solcjs from npm
  console.log("Compiling with solc...");
  
  try {
    // Use dynamic import for solc
    const solc = await import("solc");
    const output = JSON.parse(solc.default.compile(JSON.stringify(input)));
    
    if (output.errors) {
      const errors = output.errors.filter(e => e.severity === "error");
      if (errors.length > 0) {
        errors.forEach(e => console.error(e.formattedMessage));
        process.exit(1);
      }
    }

    const contract = output.contracts["PredictionMarketV3UUPS.sol"]["PredictionMarketV3UUPS"];
    const abi = contract.abi;
    const bytecode = "0x" + contract.evm.bytecode.object;

    console.log("Compiled! Bytecode size:", (bytecode.length - 2) / 2, "bytes");

    // Deploy new implementation
    console.log("\nDeploying new implementation...");
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const impl = await factory.deploy({ gasLimit: 10000000 });
    await impl.waitForDeployment();
    const implAddress = await impl.getAddress();
    console.log("New implementation:", implAddress);

    // Upgrade proxy
    console.log("\nUpgrading proxy to new implementation...");
    const proxyAbi = ["function upgradeTo(address newImplementation)"];
    const proxy = new ethers.Contract(PROXY_ADDRESS, proxyAbi, wallet);
    const tx = await proxy.upgradeTo(implAddress, { gasLimit: 500000 });
    await tx.wait();
    console.log("Upgrade complete! Tx:", tx.hash);

    console.log("\n=== SUCCESS ===");
    console.log("Proxy:", PROXY_ADDRESS);
    console.log("New impl:", implAddress);

  } catch (e) {
    console.error("Error:", e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
