// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UUPSProxy {
    bytes32 private constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    
    constructor(address _implementation, bytes memory _data) {
        require(_implementation != address(0), "Invalid implementation");
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, _implementation)
        }
        
        if (_data.length > 0) {
            (bool success,) = _implementation.delegatecall(_data);
            require(success, "Initialization failed");
        }
    }
    
    function _getImplementation() private view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
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
}
