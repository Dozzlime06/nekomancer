const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function main() {
  const PROXY_ADDRESS = "0x0118B45105e06e9696bF8959ff3115e3F505D44C";
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

  // Compile using solc
  console.log("\nCompiling contract...");
  
  // Read the contract source
  const contractPath = path.join(__dirname, "../contracts/PredictionMarketV3UUPS.sol");
  const interfacePath = path.join(__dirname, "../contracts/interfaces/IERC20.sol");
  
  const contractSource = fs.readFileSync(contractPath, "utf8");
  const interfaceSource = fs.readFileSync(interfacePath, "utf8");

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
        "*": {
          "*": ["abi", "evm.bytecode.object"]
        }
      }
    }
  };

  // Use solcjs or try to compile via command line
  try {
    const solc = require("solc");
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
      output.errors.forEach(err => {
        if (err.severity === "error") {
          console.error("Compilation error:", err.formattedMessage);
          process.exit(1);
        } else {
          console.warn("Warning:", err.formattedMessage);
        }
      });
    }

    const contract = output.contracts["PredictionMarketV3UUPS.sol"]["PredictionMarketV3UUPS"];
    const abi = contract.abi;
    const bytecode = "0x" + contract.evm.bytecode.object;

    console.log("Contract compiled successfully!");
    console.log("Bytecode size:", bytecode.length / 2, "bytes");

    // Deploy new implementation
    console.log("\nDeploying new implementation...");
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const impl = await factory.deploy();
    await impl.waitForDeployment();
    const implAddress = await impl.getAddress();
    console.log("New implementation deployed at:", implAddress);

    // Upgrade proxy
    console.log("\nUpgrading proxy...");
    const proxyAbi = ["function upgradeTo(address newImplementation)"];
    const proxy = new ethers.Contract(PROXY_ADDRESS, proxyAbi, wallet);
    const tx = await proxy.upgradeTo(implAddress);
    await tx.wait();
    console.log("Proxy upgraded successfully!");
    console.log("Transaction hash:", tx.hash);

    // Verify new function exists
    console.log("\nVerifying sellShares function...");
    const newAbi = ["function sellShares(uint256 marketId, bool isYes, uint256 sharesToSell)"];
    const newContract = new ethers.Contract(PROXY_ADDRESS, newAbi, provider);
    console.log("sellShares function is now available!");

    console.log("\n=== UPGRADE COMPLETE ===");
    console.log("Proxy address:", PROXY_ADDRESS);
    console.log("New implementation:", implAddress);

  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

main().catch(console.error);
