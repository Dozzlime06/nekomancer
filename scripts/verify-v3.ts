import * as fs from "fs";

const V3_IMPL_ADDRESS = "0xBD96F86eA9081e5C51C69257709DfD9625ebB6E9";
const CHAIN_ID = "143";
const SOURCIFY_API = "https://sourcify-api-monad.blockvision.org";

async function main() {
  console.log("🔍 Verifying V3 Implementation on MonadVision...\n");
  
  const implSource = fs.readFileSync("contracts/PredictionMarketV3UUPS.sol", "utf8");
  const ierc20Source = fs.readFileSync("contracts/interfaces/IERC20.sol", "utf8");
  
  const standardInput = {
    language: "Solidity",
    sources: {
      "contracts/PredictionMarketV3UUPS.sol": { content: implSource },
      "contracts/interfaces/IERC20.sol": { content: ierc20Source }
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      evmVersion: "cancun",
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"] }
      }
    }
  };
  
  const requestBody = {
    address: V3_IMPL_ADDRESS,
    chain: CHAIN_ID,
    files: { "standard-input.json": JSON.stringify(standardInput) },
    compilerVersion: "0.8.28+commit.7893614a",
    contractName: "PredictionMarketV3UUPS"
  };
  
  console.log("Verifying V3 at", V3_IMPL_ADDRESS);
  
  const response = await fetch(`${SOURCIFY_API}/verify/solc-json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });
  
  const result = await response.json();
  
  if (response.ok && result.result?.[0]?.status === "perfect") {
    console.log("✅ V3 Implementation verified successfully!");
    console.log(`View at: https://monadvision.com/address/${V3_IMPL_ADDRESS}`);
  } else {
    console.log("Status:", result.result?.[0]?.status || 'failed');
    if (result.error) console.log("Error:", result.error);
  }
  
  const checkStatus = await fetch(`${SOURCIFY_API}/check-by-addresses?addresses=${V3_IMPL_ADDRESS}&chainIds=${CHAIN_ID}`);
  const status = await checkStatus.json();
  console.log("\nVerification status:", status[0]?.status || 'unknown');
}

main().catch(console.error);
