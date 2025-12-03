import * as fs from "fs";

const IMPL_ADDRESS = "0x3a4730423C0B4594f8C4A6Dc2E61f5725b48a993";
const PROXY_ADDRESS = "0x0118B45105e06e9696bF8959ff3115e3F505D44C";
const CHAIN_ID = "143";

const SOURCIFY_API = "https://sourcify-api-monad.blockvision.org";

async function verifyWithStandardJson(
  address: string,
  contractName: string,
  sources: { [key: string]: { content: string } }
) {
  console.log(`\nVerifying ${contractName} at ${address}...`);
  
  const standardInput = {
    language: "Solidity",
    sources: sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,
      evmVersion: "cancun",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"]
        }
      }
    }
  };
  
  const requestBody = {
    address: address,
    chain: CHAIN_ID,
    files: {
      "standard-input.json": JSON.stringify(standardInput)
    },
    compilerVersion: "0.8.28+commit.7893614a",
    contractName: contractName
  };
  
  try {
    const response = await fetch(`${SOURCIFY_API}/verify/solc-json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    if (response.ok && result.result?.[0]?.status === "perfect") {
      console.log(`✅ ${contractName} verified successfully!`);
      console.log(`View at: https://monadvision.com/address/${address}`);
      return true;
    } else {
      console.log(`Status: ${result.result?.[0]?.status || 'failed'}`);
      if (result.error) console.log(`Error: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
}

async function main() {
  console.log("🔍 Verifying UUPS contracts on MonadVision...\n");
  
  const implSource = fs.readFileSync("contracts/PredictionMarketV2UUPS.sol", "utf8");
  const ierc20Source = fs.readFileSync("contracts/interfaces/IERC20.sol", "utf8");
  const proxySource = fs.readFileSync("contracts/UUPSProxy.sol", "utf8");
  
  // Verify Implementation
  const implSources = {
    "contracts/PredictionMarketV2UUPS.sol": { content: implSource },
    "contracts/interfaces/IERC20.sol": { content: ierc20Source }
  };
  
  await verifyWithStandardJson(IMPL_ADDRESS, "PredictionMarketV2UUPS", implSources);
  
  // Verify Proxy
  const proxySources = {
    "contracts/UUPSProxy.sol": { content: proxySource }
  };
  
  await verifyWithStandardJson(PROXY_ADDRESS, "UUPSProxy", proxySources);
  
  // Check status
  console.log("\n📊 Checking verification status...");
  
  const checkImpl = await fetch(`${SOURCIFY_API}/check-by-addresses?addresses=${IMPL_ADDRESS}&chainIds=${CHAIN_ID}`);
  const implStatus = await checkImpl.json();
  console.log(`Implementation: ${implStatus[0]?.status || 'unknown'}`);
  
  const checkProxy = await fetch(`${SOURCIFY_API}/check-by-addresses?addresses=${PROXY_ADDRESS}&chainIds=${CHAIN_ID}`);
  const proxyStatus = await checkProxy.json();
  console.log(`Proxy: ${proxyStatus[0]?.status || 'unknown'}`);
}

main().catch(console.error);
