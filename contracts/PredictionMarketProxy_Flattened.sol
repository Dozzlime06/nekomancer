// SPDX-License-Identifier: MIT
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
}