import * as fs from "fs";
import * as path from "path";

const V2_IMPLEMENTATION = "0xa6120d1eBe106A1051F84899c2912ac83EABc15F";
const PROXY_ADDRESS = "0x8A15A75501D49F44A4c2c6f0803a01534f0E3fCe";
const CHAIN_ID = "143"; // Monad Mainnet

const SOURCIFY_API = "https://sourcify-api-monad.blockvision.org";

async function verifyContract(address: string, contractPath: string, contractName: string) {
  console.log(`\nVerifying ${contractName} at ${address}...`);
  
  // Read the flattened source code
  const sourceCode = fs.readFileSync(contractPath, "utf8");
  
  // Create metadata
  const metadata = {
    compiler: {
      version: "0.8.28+commit.7893614a"
    },
    language: "Solidity",
    output: {
      abi: [],
      devdoc: {},
      userdoc: {}
    },
    settings: {
      compilationTarget: {
        [contractPath]: contractName
      },
      evmVersion: "cancun",
      libraries: {},
      metadata: {
        bytecodeHash: "none",
        useLiteralContent: true
      },
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,
      remappings: []
    },
    sources: {
      [contractPath]: {
        content: sourceCode,
        keccak256: ""
      }
    },
    version: 1
  };
  
  // Create form data
  const formData = new FormData();
  formData.append("address", address);
  formData.append("chain", CHAIN_ID);
  formData.append("files", new Blob([sourceCode], { type: "text/plain" }), path.basename(contractPath));
  formData.append("files", new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }), "metadata.json");
  
  try {
    const response = await fetch(`${SOURCIFY_API}/verify`, {
      method: "POST",
      body: formData
    });
    
    const result = await response.json();
    console.log("Response:", JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log(`✅ ${contractName} verified successfully!`);
      console.log(`View at: https://monadvision.com/address/${address}`);
    } else {
      console.log(`❌ Verification failed:`, result);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function checkVerification(address: string) {
  console.log(`\nChecking verification status for ${address}...`);
  
  try {
    const response = await fetch(`${SOURCIFY_API}/check-by-addresses?addresses=${address}&chainIds=${CHAIN_ID}`);
    const result = await response.json();
    console.log("Status:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

async function main() {
  console.log("🔍 Verifying contracts on MonadVision via Sourcify...\n");
  
  // Check current status
  await checkVerification(V2_IMPLEMENTATION);
  await checkVerification(PROXY_ADDRESS);
  
  // Try to verify V2 Implementation
  await verifyContract(
    V2_IMPLEMENTATION,
    "contracts/PredictionMarketV2_Flattened.sol",
    "PredictionMarketV2"
  );
  
  // Try to verify Proxy
  const proxySource = fs.readFileSync("contracts/PredictionMarketProxy.sol", "utf8");
  const ierc20Source = fs.readFileSync("contracts/interfaces/IERC20.sol", "utf8");
  
  // Flatten proxy
  const proxyFlattened = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PredictionMarketProxy {
    bytes32 private constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    bytes32 private constant ADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);
    
    event Upgraded(address indexed implementation);
    event AdminChanged(address previousAdmin, address newAdmin);
    
    constructor(address _implementation, bytes memory _data) {
        _setImplementation(_implementation);
        _setAdmin(msg.sender);
        
        if (_data.length > 0) {
            (bool success,) = _implementation.delegatecall(_data);
            require(success, "Initialization failed");
        }
    }
    
    function _setImplementation(address _implementation) private {
        require(_implementation != address(0), "Invalid implementation");
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, _implementation)
        }
    }
    
    function _getImplementation() private view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    function _setAdmin(address _admin) private {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            sstore(slot, _admin)
        }
    }
    
    function _getAdmin() private view returns (address adm) {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            adm := sload(slot)
        }
    }
    
    function implementation() external view returns (address) {
        return _getImplementation();
    }
    
    function admin() external view returns (address) {
        return _getAdmin();
    }
    
    function upgradeTo(address newImplementation) external {
        require(msg.sender == _getAdmin(), "Not admin");
        _setImplementation(newImplementation);
        emit Upgraded(newImplementation);
    }
    
    function changeAdmin(address newAdmin) external {
        require(msg.sender == _getAdmin(), "Not admin");
        emit AdminChanged(_getAdmin(), newAdmin);
        _setAdmin(newAdmin);
    }
    
    fallback() external payable {
        address impl = _getImplementation();
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    receive() external payable {}
}`;
  
  fs.writeFileSync("contracts/PredictionMarketProxy_Flattened.sol", proxyFlattened);
  
  await verifyContract(
    PROXY_ADDRESS,
    "contracts/PredictionMarketProxy_Flattened.sol",
    "PredictionMarketProxy"
  );
}

main().catch(console.error);
