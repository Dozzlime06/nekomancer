// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracleAdapter {
    enum Outcome { UNRESOLVED, YES, NO, VOID }
    
    function requestResolution(uint256 marketId) external;
    function getOutcome(uint256 marketId) external view returns (Outcome outcome, bool finalized);
    function getProof(uint256 marketId) external view returns (bytes memory);
}

interface IPriceFeedAdapter is IOracleAdapter {
    function setMarketParams(
        uint256 marketId,
        string calldata assetId,
        uint256 targetPrice,
        bool above
    ) external;
}

interface IOptimisticOracle is IOracleAdapter {
    function proposeOutcome(uint256 marketId, Outcome outcome, bytes calldata evidence) external payable;
    function disputeOutcome(uint256 marketId) external payable;
    function finalizeOutcome(uint256 marketId) external;
    function getProposalInfo(uint256 marketId) external view returns (
        address proposer,
        Outcome proposedOutcome,
        uint256 proposalTime,
        uint256 bondAmount,
        bool disputed
    );
}
