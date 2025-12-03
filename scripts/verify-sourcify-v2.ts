import * as fs from "fs";

const V2_IMPLEMENTATION = "0xa6120d1eBe106A1051F84899c2912ac83EABc15F";
const PROXY_ADDRESS = "0x8A15A75501D49F44A4c2c6f0803a01534f0E3fCe";
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
    console.log("Response:", JSON.stringify(result, null, 2));
    
    if (response.ok && result.result?.[0]?.status === "perfect") {
      console.log(`✅ ${contractName} verified successfully!`);
      console.log(`View at: https://monadvision.com/address/${address}`);
      return true;
    } else {
      console.log(`Result status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
}

async function main() {
  console.log("🔍 Verifying contracts on MonadVision via Sourcify Standard JSON...\n");
  
  // Read source files
  const v2Source = fs.readFileSync("contracts/PredictionMarketV2.sol", "utf8");
  const ierc20Source = fs.readFileSync("contracts/interfaces/IERC20.sol", "utf8");
  const proxySource = fs.readFileSync("contracts/PredictionMarketProxy.sol", "utf8");
  
  // Verify V2 Implementation
  const v2Sources = {
    "contracts/PredictionMarketV2.sol": { content: v2Source },
    "contracts/interfaces/IERC20.sol": { content: ierc20Source }
  };
  
  await verifyWithStandardJson(V2_IMPLEMENTATION, "PredictionMarketV2", v2Sources);
  
  // Verify Proxy
  const proxySources = {
    "contracts/PredictionMarketProxy.sol": { content: proxySource }
  };
  
  await verifyWithStandardJson(PROXY_ADDRESS, "PredictionMarketProxy", proxySources);
}

main().catch(console.error);
