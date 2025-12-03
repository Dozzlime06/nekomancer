// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";

contract PredictionMarketV3UUPS {
    bytes32 private constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    
    IERC20 public usdc;
    address public owner;
    uint8 private _initialized;
    
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2% platform fee
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant CHALLENGE_WINDOW = 24 hours;
    uint256 public constant MAX_RESOLUTION_TIMEOUT = 7 days;
    uint256 public constant MIN_PROPOSAL_BOND = 5 * 1e6; // 5 USDC
    uint256 public constant MIN_CHALLENGE_BOND = 10 * 1e6; // 10 USDC
    
    address public constant TREASURY = 0xE9059B5f1C60ecf9C1F07ac2bBa148A75394f56e;
    
    enum MarketStatus { OPEN, PENDING_RESOLUTION, RESOLVED, VOIDED }
    enum Outcome { UNRESOLVED, YES, NO }
    enum Category { CRYPTO, SPORTS, POLITICS, POP_CULTURE, SCIENCE, OTHER }
    
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
        // Crypto-specific
        string targetAsset;
        uint256 targetPrice;
        bool priceAbove;
        // Resolution data
        uint256 resolvedPrice;
        uint256 resolvedAt;
        // Sports-specific (stored in metadata)
        string metadata; // JSON: {"teams": ["Team A", "Team B"], "gameId": "123", "league": "NBA"}
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
    event Upgraded(address indexed implementation);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier initializer() {
        require(_initialized == 0, "Already initialized");
        _initialized = 1;
        _;
    }
    
    constructor() {
        _initialized = type(uint8).max;
    }
    
    function initialize(address _usdc, address _owner) public initializer {
        usdc = IERC20(_usdc);
        owner = _owner;
        nextMarketId = 1;
    }
    
    function upgradeTo(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "Invalid implementation");
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
        emit Upgraded(newImplementation);
    }
    
    function getImplementation() external view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // Sweep any accumulated treasury balance to treasury wallet
    function sweepTreasuryBalance() external onlyOwner {
        uint256 balance = userBalances[TREASURY];
        if (balance > 0) {
            userBalances[TREASURY] = 0;
            require(usdc.transfer(TREASURY, balance), "Transfer failed");
        }
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
    
    // Create market with full parameters (for all categories)
    function createMarketFull(
        string calldata question,
        Category category,
        uint256 deadline,
        string calldata targetAsset,
        uint256 targetPrice,
        bool priceAbove,
        string calldata metadata
    ) external returns (uint256) {
        require(deadline > block.timestamp + 1 hours, "Deadline too soon");
        require(bytes(question).length > 0, "Question required");
        
        // For crypto markets, require target asset and price
        if (category == Category.CRYPTO) {
            require(bytes(targetAsset).length > 0, "Target asset required for crypto");
            require(targetPrice > 0, "Target price required for crypto");
        }
        
        uint256 marketId = nextMarketId++;
        
        markets[marketId] = Market({
            id: marketId,
            creator: msg.sender,
            question: question,
            category: category,
            deadline: deadline,
            status: MarketStatus.OPEN,
            outcome: Outcome.UNRESOLVED,
            yesPool: 50 * 1e6,
            noPool: 50 * 1e6,
            totalVolume: 0,
            targetAsset: targetAsset,
            targetPrice: targetPrice,
            priceAbove: priceAbove,
            resolvedPrice: 0,
            resolvedAt: 0,
            metadata: metadata
        });
        
        emit MarketCreated(marketId, msg.sender, question, deadline, targetAsset, targetPrice, priceAbove);
        return marketId;
    }
    
    // Backwards compatible - create crypto market (no metadata)
    function createMarket(
        string calldata question,
        Category category,
        uint256 deadline,
        string calldata targetAsset,
        uint256 targetPrice,
        bool priceAbove
    ) external returns (uint256) {
        require(deadline > block.timestamp + 1 hours, "Deadline too soon");
        require(bytes(question).length > 0, "Question required");
        
        if (category == Category.CRYPTO) {
            require(bytes(targetAsset).length > 0, "Target asset required for crypto");
            require(targetPrice > 0, "Target price required for crypto");
        }
        
        uint256 marketId = nextMarketId++;
        
        markets[marketId] = Market({
            id: marketId,
            creator: msg.sender,
            question: question,
            category: category,
            deadline: deadline,
            status: MarketStatus.OPEN,
            outcome: Outcome.UNRESOLVED,
            yesPool: 50 * 1e6,
            noPool: 50 * 1e6,
            totalVolume: 0,
            targetAsset: targetAsset,
            targetPrice: targetPrice,
            priceAbove: priceAbove,
            resolvedPrice: 0,
            resolvedAt: 0,
            metadata: ""
        });
        
        emit MarketCreated(marketId, msg.sender, question, deadline, targetAsset, targetPrice, priceAbove);
        return marketId;
    }
    
    // ============ TRADING (AMM) - FIXED CPMM ============
    
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
        
        // Deduct platform fee first
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = amount - platformFee;
        
        uint256 shares;
        uint256 price = getPrice(marketId, isYes);
        
        // FIXED CPMM: k = yesPool * noPool (constant product)
        // When buying YES: Add to noPool (payment), calculate shares from yesPool decrease
        // When buying NO: Add to yesPool (payment), calculate shares from noPool decrease
        uint256 k = market.yesPool * market.noPool;
        
        if (isYes) {
            // User pays into noPool, receives yesShares
            uint256 newNoPool = market.noPool + amountAfterFee;
            uint256 newYesPool = k / newNoPool;
            shares = market.yesPool - newYesPool;
            market.yesPool = newYesPool;
            market.noPool = newNoPool;
        } else {
            // User pays into yesPool, receives noShares
            uint256 newYesPool = market.yesPool + amountAfterFee;
            uint256 newNoPool = k / newYesPool;
            shares = market.noPool - newNoPool;
            market.noPool = newNoPool;
            market.yesPool = newYesPool;
        }
        
        require(shares > 0, "No shares to buy");
        
        userBalances[msg.sender] -= amount;
        
        // Auto-forward fee directly to treasury wallet
        require(usdc.transfer(TREASURY, platformFee), "Fee transfer failed");
        
        Position storage pos = positions[marketId][msg.sender];
        if (isYes) {
            pos.yesShares += shares;
        } else {
            pos.noShares += shares;
        }
        
        market.totalVolume += amount;
        
        emit PlatformFeeCollected(marketId, platformFee);
        emit SharesPurchased(marketId, msg.sender, isYes, amount, shares, price);
    }
    
    event SharesSold(uint256 indexed marketId, address indexed user, bool isYes, uint256 shares, uint256 amount, uint256 price);
    
    function sellShares(uint256 marketId, bool isYes, uint256 sharesToSell) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp < market.deadline, "Market expired");
        require(sharesToSell > 0, "Shares must be > 0");
        
        Position storage pos = positions[marketId][msg.sender];
        if (isYes) {
            require(pos.yesShares >= sharesToSell, "Insufficient YES shares");
        } else {
            require(pos.noShares >= sharesToSell, "Insufficient NO shares");
        }
        
        uint256 payout;
        uint256 price = getPrice(marketId, isYes);
        
        // CPMM sell: reverse of buy
        // When selling YES: Add shares back to yesPool, remove from noPool
        // When selling NO: Add shares back to noPool, remove from yesPool
        uint256 k = market.yesPool * market.noPool;
        
        if (isYes) {
            // User sells yesShares, receives from noPool
            uint256 newYesPool = market.yesPool + sharesToSell;
            uint256 newNoPool = k / newYesPool;
            payout = market.noPool - newNoPool;
            market.yesPool = newYesPool;
            market.noPool = newNoPool;
            pos.yesShares -= sharesToSell;
        } else {
            // User sells noShares, receives from yesPool
            uint256 newNoPool = market.noPool + sharesToSell;
            uint256 newYesPool = k / newNoPool;
            payout = market.yesPool - newYesPool;
            market.noPool = newNoPool;
            market.yesPool = newYesPool;
            pos.noShares -= sharesToSell;
        }
        
        require(payout > 0, "No payout");
        
        // Deduct platform fee from payout
        uint256 platformFee = (payout * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 payoutAfterFee = payout - platformFee;
        
        userBalances[msg.sender] += payoutAfterFee;
        
        // Auto-forward fee directly to treasury wallet
        require(usdc.transfer(TREASURY, platformFee), "Fee transfer failed");
        
        market.totalVolume += payout;
        
        emit PlatformFeeCollected(marketId, platformFee);
        emit SharesSold(marketId, msg.sender, isYes, sharesToSell, payoutAfterFee, price);
    }
    
    // ============ PERMISSIONLESS RESOLUTION ============
    
    // For CRYPTO markets - uses price to determine outcome
    function proposeOutcomeWithPrice(uint256 marketId, uint256 currentPrice) external {
        Market storage market = markets[marketId];
        require(market.category == Category.CRYPTO, "Use proposeOutcome for non-crypto");
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
    
    // For NON-CRYPTO markets - direct YES/NO proposal
    function proposeOutcome(uint256 marketId, bool isYes) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp >= market.deadline, "Market not expired");
        require(userBalances[msg.sender] >= MIN_PROPOSAL_BOND, "Insufficient bond");
        
        Proposal storage existing = proposals[marketId];
        require(existing.proposer == address(0), "Already proposed");
        
        userBalances[msg.sender] -= MIN_PROPOSAL_BOND;
        
        Outcome outcome = isYes ? Outcome.YES : Outcome.NO;
        
        proposals[marketId] = Proposal({
            proposer: msg.sender,
            proposedOutcome: outcome,
            proposedPrice: 0,
            proposalTime: block.timestamp,
            bond: MIN_PROPOSAL_BOND,
            challenged: false,
            challenger: address(0),
            challengeBond: 0,
            challengeOutcome: Outcome.UNRESOLVED,
            challengePrice: 0
        });
        
        market.status = MarketStatus.PENDING_RESOLUTION;
        
        emit OutcomeProposed(marketId, msg.sender, outcome, 0, MIN_PROPOSAL_BOND);
    }
    
    // Challenge with price (for CRYPTO)
    function challengeOutcomeWithPrice(uint256 marketId, uint256 correctPrice) external {
        Market storage market = markets[marketId];
        Proposal storage proposal = proposals[marketId];
        
        require(market.category == Category.CRYPTO, "Use challengeOutcome for non-crypto");
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
    
    // Challenge with direct outcome (for NON-CRYPTO)
    function challengeOutcome(uint256 marketId) external {
        Market storage market = markets[marketId];
        Proposal storage proposal = proposals[marketId];
        
        require(market.status == MarketStatus.PENDING_RESOLUTION, "Not pending");
        require(block.timestamp < proposal.proposalTime + CHALLENGE_WINDOW, "Challenge window closed");
        require(!proposal.challenged, "Already challenged");
        require(userBalances[msg.sender] >= MIN_CHALLENGE_BOND, "Insufficient bond");
        
        // Challenger proposes the opposite outcome
        Outcome newOutcome = proposal.proposedOutcome == Outcome.YES ? Outcome.NO : Outcome.YES;
        
        userBalances[msg.sender] -= MIN_CHALLENGE_BOND;
        
        proposal.challenged = true;
        proposal.challenger = msg.sender;
        proposal.challengeBond = MIN_CHALLENGE_BOND;
        proposal.challengeOutcome = newOutcome;
        proposal.challengePrice = 0;
        
        emit OutcomeChallenged(marketId, msg.sender, newOutcome, 0, MIN_CHALLENGE_BOND);
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
        return "3.0.0-UUPS";
    }
}
