// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";

abstract contract Initializable {
    uint8 private _initialized;
    bool private _initializing;
    
    modifier initializer() {
        require(_initialized == 0, "Already initialized");
        _initialized = 1;
        _;
    }
    
    modifier reinitializer(uint8 version) {
        require(_initialized < version, "Already initialized");
        _initialized = version;
        _;
    }
    
    function _disableInitializers() internal {
        _initialized = type(uint8).max;
    }
}

abstract contract UUPSUpgradeable {
    address private _implementation;
    
    event Upgraded(address indexed implementation);
    
    function upgradeTo(address newImplementation) external {
        _authorizeUpgrade(newImplementation);
        _implementation = newImplementation;
        emit Upgraded(newImplementation);
    }
    
    function _authorizeUpgrade(address newImplementation) internal virtual;
}

contract PredictionMarketV2 is Initializable, UUPSUpgradeable {
    IERC20 public usdc;
    address public owner;
    
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2% platform fee
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant CHALLENGE_WINDOW = 24 hours;
    uint256 public constant MAX_RESOLUTION_TIMEOUT = 7 days;
    uint256 public constant MIN_PROPOSAL_BOND = 5 * 1e6; // 5 USDC
    uint256 public constant MIN_CHALLENGE_BOND = 10 * 1e6; // 10 USDC
    
    address public constant TREASURY = 0xE9059B5f1C60ecf9C1F07ac2bBa148A75394f56e;
    
    enum MarketStatus { OPEN, PENDING_RESOLUTION, RESOLVED, VOIDED }
    enum Outcome { UNRESOLVED, YES, NO }
    enum Category { CRYPTO }
    
    struct Market {
        uint256 id;
        address creator;
        string question;
        Category category;
        uint256 deadline;
        MarketStatus status;
        Outcome outcome;
        uint256 yesPool;
        uint256 noPool;
        uint256 totalVolume;
        string targetAsset;
        uint256 targetPrice;
        bool priceAbove;
        uint256 resolvedPrice;
        uint256 resolvedAt;
    }
    
    struct Position {
        uint256 yesShares;
        uint256 noShares;
    }
    
    struct Proposal {
        address proposer;
        Outcome proposedOutcome;
        uint256 proposedPrice;
        uint256 proposalTime;
        uint256 bond;
        bool challenged;
        address challenger;
        uint256 challengeBond;
        Outcome challengeOutcome;
        uint256 challengePrice;
    }
    
    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public userBalances;
    
    event MarketCreated(uint256 indexed marketId, address indexed creator, string question, uint256 deadline, string targetAsset, uint256 targetPrice, bool priceAbove);
    event SharesPurchased(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount, uint256 shares, uint256 price);
    event OutcomeProposed(uint256 indexed marketId, address indexed proposer, Outcome outcome, uint256 price, uint256 bond);
    event OutcomeChallenged(uint256 indexed marketId, address indexed challenger, Outcome outcome, uint256 price, uint256 bond);
    event MarketResolved(uint256 indexed marketId, Outcome outcome, uint256 resolvedPrice, address winner, uint256 reward);
    event MarketVoided(uint256 indexed marketId);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PlatformFeeCollected(uint256 indexed marketId, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address _usdc, address _owner) public initializer {
        usdc = IERC20(_usdc);
        owner = _owner;
        nextMarketId = 1;
    }
    
    function initializeV2() public reinitializer(2) {
        // V2 initialization - treasury is now a constant
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ============ DEPOSIT/WITHDRAW ============
    
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        userBalances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }
    
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        userBalances[msg.sender] -= amount;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }
    
    // ============ MARKET CREATION ============
    
    function createMarket(
        string calldata question,
        uint256 deadline,
        string calldata targetAsset,
        uint256 targetPrice,
        bool priceAbove
    ) external returns (uint256) {
        require(deadline > block.timestamp + 1 hours, "Deadline too soon");
        require(bytes(question).length > 0, "Question required");
        require(bytes(targetAsset).length > 0, "Target asset required");
        require(targetPrice > 0, "Target price required");
        
        uint256 marketId = nextMarketId++;
        
        markets[marketId] = Market({
            id: marketId,
            creator: msg.sender,
            question: question,
            category: Category.CRYPTO,
            deadline: deadline,
            status: MarketStatus.OPEN,
            outcome: Outcome.UNRESOLVED,
            yesPool: 1000 * 1e6,
            noPool: 1000 * 1e6,
            totalVolume: 0,
            targetAsset: targetAsset,
            targetPrice: targetPrice,
            priceAbove: priceAbove,
            resolvedPrice: 0,
            resolvedAt: 0
        });
        
        emit MarketCreated(marketId, msg.sender, question, deadline, targetAsset, targetPrice, priceAbove);
        return marketId;
    }
    
    // ============ TRADING (AMM) ============
    
    function getPrice(uint256 marketId, bool isYes) public view returns (uint256) {
        Market storage market = markets[marketId];
        uint256 total = market.yesPool + market.noPool;
        if (total == 0) return 5000;
        
        if (isYes) {
            return (market.noPool * 10000) / total;
        } else {
            return (market.yesPool * 10000) / total;
        }
    }
    
    function buyShares(uint256 marketId, bool isYes, uint256 amount) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp < market.deadline, "Market expired");
        require(amount > 0, "Amount must be > 0");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        
        uint256 shares;
        uint256 price = getPrice(marketId, isYes);
        
        if (isYes) {
            uint256 k = market.yesPool * market.noPool;
            market.noPool += amount;
            uint256 newYesPool = k / market.noPool;
            shares = market.yesPool - newYesPool;
            market.yesPool = newYesPool;
        } else {
            uint256 k = market.yesPool * market.noPool;
            market.yesPool += amount;
            uint256 newNoPool = k / market.yesPool;
            shares = market.noPool - newNoPool;
            market.noPool = newNoPool;
        }
        
        require(shares > 0, "No shares to buy");
        
        userBalances[msg.sender] -= amount;
        
        Position storage pos = positions[marketId][msg.sender];
        if (isYes) {
            pos.yesShares += shares;
        } else {
            pos.noShares += shares;
        }
        
        // 2% platform fee goes to treasury
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        userBalances[TREASURY] += platformFee;
        market.totalVolume += amount;
        
        emit PlatformFeeCollected(marketId, platformFee);
        emit SharesPurchased(marketId, msg.sender, isYes, amount, shares, price);
    }
    
    // ============ PERMISSIONLESS RESOLUTION ============
    
    function proposeOutcome(uint256 marketId, uint256 currentPrice) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp >= market.deadline, "Market not expired");
        require(userBalances[msg.sender] >= MIN_PROPOSAL_BOND, "Insufficient bond");
        
        Proposal storage existing = proposals[marketId];
        require(existing.proposer == address(0), "Already proposed");
        
        userBalances[msg.sender] -= MIN_PROPOSAL_BOND;
        
        Outcome outcome;
        if (market.priceAbove) {
            outcome = currentPrice >= market.targetPrice ? Outcome.YES : Outcome.NO;
        } else {
            outcome = currentPrice < market.targetPrice ? Outcome.YES : Outcome.NO;
        }
        
        proposals[marketId] = Proposal({
            proposer: msg.sender,
            proposedOutcome: outcome,
            proposedPrice: currentPrice,
            proposalTime: block.timestamp,
            bond: MIN_PROPOSAL_BOND,
            challenged: false,
            challenger: address(0),
            challengeBond: 0,
            challengeOutcome: Outcome.UNRESOLVED,
            challengePrice: 0
        });
        
        market.status = MarketStatus.PENDING_RESOLUTION;
        
        emit OutcomeProposed(marketId, msg.sender, outcome, currentPrice, MIN_PROPOSAL_BOND);
    }
    
    function challengeOutcome(uint256 marketId, uint256 correctPrice) external {
        Market storage market = markets[marketId];
        Proposal storage proposal = proposals[marketId];
        
        require(market.status == MarketStatus.PENDING_RESOLUTION, "Not pending");
        require(block.timestamp < proposal.proposalTime + CHALLENGE_WINDOW, "Challenge window closed");
        require(!proposal.challenged, "Already challenged");
        require(userBalances[msg.sender] >= MIN_CHALLENGE_BOND, "Insufficient bond");
        
        Outcome newOutcome;
        if (market.priceAbove) {
            newOutcome = correctPrice >= market.targetPrice ? Outcome.YES : Outcome.NO;
        } else {
            newOutcome = correctPrice < market.targetPrice ? Outcome.YES : Outcome.NO;
        }
        
        require(newOutcome != proposal.proposedOutcome, "Same outcome");
        
        userBalances[msg.sender] -= MIN_CHALLENGE_BOND;
        
        proposal.challenged = true;
        proposal.challenger = msg.sender;
        proposal.challengeBond = MIN_CHALLENGE_BOND;
        proposal.challengeOutcome = newOutcome;
        proposal.challengePrice = correctPrice;
        
        emit OutcomeChallenged(marketId, msg.sender, newOutcome, correctPrice, MIN_CHALLENGE_BOND);
    }
    
    function finalizeResolution(uint256 marketId) external {
        Market storage market = markets[marketId];
        Proposal storage proposal = proposals[marketId];
        
        require(market.status == MarketStatus.PENDING_RESOLUTION, "Not pending");
        require(block.timestamp >= proposal.proposalTime + CHALLENGE_WINDOW, "Challenge window open");
        
        if (proposal.challenged) {
            uint256 totalBonds = proposal.bond + proposal.challengeBond;
            
            if (proposal.challengeBond > proposal.bond) {
                market.status = MarketStatus.RESOLVED;
                market.outcome = proposal.challengeOutcome;
                market.resolvedPrice = proposal.challengePrice;
                market.resolvedAt = block.timestamp;
                userBalances[proposal.challenger] += totalBonds;
                emit MarketResolved(marketId, proposal.challengeOutcome, proposal.challengePrice, proposal.challenger, totalBonds);
            } else {
                market.status = MarketStatus.RESOLVED;
                market.outcome = proposal.proposedOutcome;
                market.resolvedPrice = proposal.proposedPrice;
                market.resolvedAt = block.timestamp;
                userBalances[proposal.proposer] += totalBonds;
                emit MarketResolved(marketId, proposal.proposedOutcome, proposal.proposedPrice, proposal.proposer, totalBonds);
            }
        } else {
            market.status = MarketStatus.RESOLVED;
            market.outcome = proposal.proposedOutcome;
            market.resolvedPrice = proposal.proposedPrice;
            market.resolvedAt = block.timestamp;
            userBalances[proposal.proposer] += proposal.bond;
            emit MarketResolved(marketId, proposal.proposedOutcome, proposal.proposedPrice, proposal.proposer, proposal.bond);
        }
    }
    
    function voidMarket(uint256 marketId) external {
        Market storage market = markets[marketId];
        Proposal storage proposal = proposals[marketId];
        
        require(market.status == MarketStatus.OPEN || market.status == MarketStatus.PENDING_RESOLUTION, "Cannot void");
        require(block.timestamp > market.deadline + MAX_RESOLUTION_TIMEOUT, "Timeout not reached");
        
        if (proposal.proposer != address(0)) {
            userBalances[proposal.proposer] += proposal.bond;
            if (proposal.challenged) {
                userBalances[proposal.challenger] += proposal.challengeBond;
            }
        }
        
        market.status = MarketStatus.VOIDED;
        emit MarketVoided(marketId);
    }
    
    // ============ CLAIM WINNINGS ============
    
    function claimWinnings(uint256 marketId) external {
        Market storage market = markets[marketId];
        Position storage pos = positions[marketId][msg.sender];
        
        require(market.status == MarketStatus.RESOLVED || market.status == MarketStatus.VOIDED, "Market not resolved");
        require(pos.yesShares > 0 || pos.noShares > 0, "No position");
        
        uint256 payout = 0;
        
        if (market.status == MarketStatus.VOIDED) {
            uint256 totalShares = pos.yesShares + pos.noShares;
            payout = totalShares;
        } else if (market.outcome == Outcome.YES) {
            payout = pos.yesShares;
        } else if (market.outcome == Outcome.NO) {
            payout = pos.noShares;
        }
        
        pos.yesShares = 0;
        pos.noShares = 0;
        
        if (payout > 0) {
            userBalances[msg.sender] += payout;
            emit WinningsClaimed(marketId, msg.sender, payout);
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }
    
    function getPosition(uint256 marketId, address user) external view returns (Position memory) {
        return positions[marketId][user];
    }
    
    function getProposal(uint256 marketId) external view returns (Proposal memory) {
        return proposals[marketId];
    }
    
    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }
    
    function getTreasury() external pure returns (address) {
        return TREASURY;
    }
    
    function getVersion() external pure returns (string memory) {
        return "2.0.0";
    }
}
