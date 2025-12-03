// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";

contract PredictionMarketV4UUPS {
    bytes32 private constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    
    IERC20 public usdc;
    address public owner;
    uint8 private _initialized;
    
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2% platform fee
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant CHALLENGE_WINDOW = 24 hours;
    uint256 public constant MAX_RESOLUTION_TIMEOUT = 7 days;
    uint256 public constant MIN_PROPOSAL_BOND = 5 * 1e18; // 5 MANCER (18 decimals)
    uint256 public constant MIN_CHALLENGE_BOND = 10 * 1e18; // 10 MANCER (18 decimals)
    uint256 public constant INITIAL_POOL_SIZE = 50 * 1e18; // 50 MANCER each side
    
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
        string targetAsset;
        uint256 targetPrice;
        bool priceAbove;
        uint256 resolvedPrice;
        uint256 resolvedAt;
        string metadata;
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
    
    // V4: Migration tracking and pause
    bool public migrated;
    bool public paused;
    
    event MarketCreated(uint256 indexed marketId, address indexed creator, string question, uint256 deadline, string targetAsset, uint256 targetPrice, bool priceAbove);
    event SharesPurchased(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount, uint256 shares, uint256 price);
    event SharesSold(uint256 indexed marketId, address indexed user, bool isYes, uint256 shares, uint256 amount, uint256 price);
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
    event Migrated(uint256 marketsProcessed);
    
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
    
    // ============ V4 MIGRATION ============
    
    // Pause trading during migration
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // Migration Step 1: Void corrupted markets and refund users
    // Users can then claim their share via claimWinnings (voided refunds)
    function voidCorruptedMarkets(uint256[] calldata marketIds) external onlyOwner {
        for (uint256 i = 0; i < marketIds.length; i++) {
            uint256 mId = marketIds[i];
            Market storage m = markets[mId];
            if (m.id > 0 && m.status != MarketStatus.VOIDED) {
                m.status = MarketStatus.VOIDED;
                
                // Refund any proposal bonds
                Proposal storage proposal = proposals[mId];
                if (proposal.proposer != address(0)) {
                    userBalances[proposal.proposer] += proposal.bond;
                }
                if (proposal.challenged && proposal.challenger != address(0)) {
                    userBalances[proposal.challenger] += proposal.challengeBond;
                }
                
                emit MarketVoided(mId);
            }
        }
    }
    
    // Migration Step 2: Manually credit users for corrupted positions
    // Owner manually calculates what users should get back and credits them
    function creditUsers(address[] calldata users, uint256[] calldata amounts) external onlyOwner {
        require(users.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < users.length; i++) {
            userBalances[users[i]] += amounts[i];
        }
    }
    
    // Migration Step 3: Clear corrupted positions after refund
    function clearPositions(address[] calldata users, uint256[] calldata marketIds) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            for (uint256 j = 0; j < marketIds.length; j++) {
                Position storage pos = positions[marketIds[j]][users[i]];
                pos.yesShares = 0;
                pos.noShares = 0;
            }
        }
    }
    
    // Migration Step 4: Reset market pools to proper values for fresh start
    function resetMarketPools(uint256[] calldata marketIds) external onlyOwner {
        for (uint256 i = 0; i < marketIds.length; i++) {
            uint256 mId = marketIds[i];
            Market storage m = markets[mId];
            if (m.id > 0) {
                m.yesPool = INITIAL_POOL_SIZE;
                m.noPool = INITIAL_POOL_SIZE;
                m.totalVolume = 0;
            }
        }
    }
    
    // Mark migration complete
    function setMigrated(bool _migrated) external onlyOwner {
        migrated = _migrated;
    }
    
    // ============ UPGRADE ============
    
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
    
    // Emergency withdraw all - owner can help users withdraw
    function emergencyWithdraw(address user) external onlyOwner {
        uint256 balance = userBalances[user];
        require(balance > 0, "No balance");
        userBalances[user] = 0;
        require(usdc.transfer(user, balance), "Transfer failed");
        emit Withdrawn(user, balance);
    }
    
    // ============ MARKET CREATION ============
    
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
            yesPool: INITIAL_POOL_SIZE,
            noPool: INITIAL_POOL_SIZE,
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
            yesPool: INITIAL_POOL_SIZE,
            noPool: INITIAL_POOL_SIZE,
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
    
    function buyShares(uint256 marketId, bool isYes, uint256 amount) external whenNotPaused {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp < market.deadline, "Market expired");
        require(amount > 0, "Amount must be > 0");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = amount - platformFee;
        
        uint256 shares;
        uint256 price = getPrice(marketId, isYes);
        
        uint256 k = market.yesPool * market.noPool;
        
        if (isYes) {
            uint256 newNoPool = market.noPool + amountAfterFee;
            uint256 newYesPool = k / newNoPool;
            shares = market.yesPool - newYesPool;
            market.yesPool = newYesPool;
            market.noPool = newNoPool;
        } else {
            uint256 newYesPool = market.yesPool + amountAfterFee;
            uint256 newNoPool = k / newYesPool;
            shares = market.noPool - newNoPool;
            market.noPool = newNoPool;
            market.yesPool = newYesPool;
        }
        
        require(shares > 0, "No shares to buy");
        
        userBalances[msg.sender] -= amount;
        userBalances[TREASURY] += platformFee;
        
        market.totalVolume += amount;
        
        Position storage pos = positions[marketId][msg.sender];
        if (isYes) {
            pos.yesShares += shares;
        } else {
            pos.noShares += shares;
        }
        
        emit SharesPurchased(marketId, msg.sender, isYes, amount, shares, price);
    }
    
    function sellShares(uint256 marketId, bool isYes, uint256 sharesToSell) external whenNotPaused {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp < market.deadline, "Market expired");
        require(sharesToSell > 0, "Shares must be > 0");
        
        Position storage pos = positions[marketId][msg.sender];
        uint256 userShares = isYes ? pos.yesShares : pos.noShares;
        require(userShares >= sharesToSell, "Insufficient shares");
        
        uint256 k = market.yesPool * market.noPool;
        uint256 payout;
        uint256 price = getPrice(marketId, isYes);
        
        if (isYes) {
            uint256 newYesPool = market.yesPool + sharesToSell;
            uint256 newNoPool = k / newYesPool;
            payout = market.noPool - newNoPool;
            market.yesPool = newYesPool;
            market.noPool = newNoPool;
            pos.yesShares -= sharesToSell;
        } else {
            uint256 newNoPool = market.noPool + sharesToSell;
            uint256 newYesPool = k / newNoPool;
            payout = market.yesPool - newYesPool;
            market.noPool = newNoPool;
            market.yesPool = newYesPool;
            pos.noShares -= sharesToSell;
        }
        
        uint256 platformFee = (payout * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 payoutAfterFee = payout - platformFee;
        
        userBalances[msg.sender] += payoutAfterFee;
        userBalances[TREASURY] += platformFee;
        
        emit SharesSold(marketId, msg.sender, isYes, sharesToSell, payoutAfterFee, price);
    }
    
    // ============ RESOLUTION ============
    
    function proposeOutcome(uint256 marketId, bool isYes) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp >= market.deadline, "Market not expired");
        require(userBalances[msg.sender] >= MIN_PROPOSAL_BOND, "Insufficient bond");
        
        Proposal storage proposal = proposals[marketId];
        require(proposal.proposer == address(0), "Already proposed");
        
        userBalances[msg.sender] -= MIN_PROPOSAL_BOND;
        
        proposal.proposer = msg.sender;
        proposal.proposedOutcome = isYes ? Outcome.YES : Outcome.NO;
        proposal.proposalTime = block.timestamp;
        proposal.bond = MIN_PROPOSAL_BOND;
        
        market.status = MarketStatus.PENDING_RESOLUTION;
        
        emit OutcomeProposed(marketId, msg.sender, proposal.proposedOutcome, 0, MIN_PROPOSAL_BOND);
    }
    
    function proposeOutcomeWithPrice(uint256 marketId, uint256 currentPrice) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp >= market.deadline, "Market not expired");
        require(userBalances[msg.sender] >= MIN_PROPOSAL_BOND, "Insufficient bond");
        require(market.category == Category.CRYPTO, "Only for crypto markets");
        
        Proposal storage proposal = proposals[marketId];
        require(proposal.proposer == address(0), "Already proposed");
        
        userBalances[msg.sender] -= MIN_PROPOSAL_BOND;
        
        bool isYes;
        if (market.priceAbove) {
            isYes = currentPrice >= market.targetPrice;
        } else {
            isYes = currentPrice <= market.targetPrice;
        }
        
        proposal.proposer = msg.sender;
        proposal.proposedOutcome = isYes ? Outcome.YES : Outcome.NO;
        proposal.proposedPrice = currentPrice;
        proposal.proposalTime = block.timestamp;
        proposal.bond = MIN_PROPOSAL_BOND;
        
        market.status = MarketStatus.PENDING_RESOLUTION;
        
        emit OutcomeProposed(marketId, msg.sender, proposal.proposedOutcome, currentPrice, MIN_PROPOSAL_BOND);
    }
    
    function challengeOutcome(uint256 marketId, uint256 correctPrice) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.PENDING_RESOLUTION, "Not pending");
        
        Proposal storage proposal = proposals[marketId];
        require(!proposal.challenged, "Already challenged");
        require(block.timestamp < proposal.proposalTime + CHALLENGE_WINDOW, "Challenge window closed");
        require(userBalances[msg.sender] >= MIN_CHALLENGE_BOND, "Insufficient bond");
        
        userBalances[msg.sender] -= MIN_CHALLENGE_BOND;
        
        proposal.challenged = true;
        proposal.challenger = msg.sender;
        proposal.challengeBond = MIN_CHALLENGE_BOND;
        proposal.challengePrice = correctPrice;
        
        bool challengerIsYes;
        if (market.priceAbove) {
            challengerIsYes = correctPrice >= market.targetPrice;
        } else {
            challengerIsYes = correctPrice <= market.targetPrice;
        }
        proposal.challengeOutcome = challengerIsYes ? Outcome.YES : Outcome.NO;
        
        emit OutcomeChallenged(marketId, msg.sender, proposal.challengeOutcome, correctPrice, MIN_CHALLENGE_BOND);
    }
    
    function finalizeResolution(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.PENDING_RESOLUTION, "Not pending");
        
        Proposal storage proposal = proposals[marketId];
        require(block.timestamp >= proposal.proposalTime + CHALLENGE_WINDOW, "Challenge window open");
        
        Outcome finalOutcome;
        address winner;
        uint256 reward;
        
        if (proposal.challenged) {
            finalOutcome = proposal.challengeOutcome;
            winner = proposal.challenger;
            reward = proposal.bond + proposal.challengeBond;
            market.resolvedPrice = proposal.challengePrice;
        } else {
            finalOutcome = proposal.proposedOutcome;
            winner = proposal.proposer;
            reward = proposal.bond;
            market.resolvedPrice = proposal.proposedPrice;
        }
        
        market.status = MarketStatus.RESOLVED;
        market.outcome = finalOutcome;
        market.resolvedAt = block.timestamp;
        
        userBalances[winner] += reward;
        
        emit MarketResolved(marketId, finalOutcome, market.resolvedPrice, winner, reward);
    }
    
    function voidMarket(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.status != MarketStatus.RESOLVED, "Already resolved");
        require(market.status != MarketStatus.VOIDED, "Already voided");
        
        market.status = MarketStatus.VOIDED;
        
        Proposal storage proposal = proposals[marketId];
        if (proposal.proposer != address(0)) {
            userBalances[proposal.proposer] += proposal.bond;
        }
        if (proposal.challenged && proposal.challenger != address(0)) {
            userBalances[proposal.challenger] += proposal.challengeBond;
        }
        
        emit MarketVoided(marketId);
    }
    
    function claimWinnings(uint256 marketId) external {
        Market storage market = markets[marketId];
        Position storage pos = positions[marketId][msg.sender];
        
        uint256 payout = 0;
        
        if (market.status == MarketStatus.RESOLVED) {
            if (market.outcome == Outcome.YES && pos.yesShares > 0) {
                payout = pos.yesShares;
                pos.yesShares = 0;
            } else if (market.outcome == Outcome.NO && pos.noShares > 0) {
                payout = pos.noShares;
                pos.noShares = 0;
            }
        } else if (market.status == MarketStatus.VOIDED) {
            uint256 total = market.yesPool + market.noPool;
            if (total > 0) {
                uint256 yesValue = (pos.yesShares * market.yesPool) / total;
                uint256 noValue = (pos.noShares * market.noPool) / total;
                payout = yesValue + noValue;
            }
            pos.yesShares = 0;
            pos.noShares = 0;
        }
        
        require(payout > 0, "Nothing to claim");
        userBalances[msg.sender] += payout;
        
        emit WinningsClaimed(marketId, msg.sender, payout);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getVersion() external pure returns (string memory) {
        return "V4-18DEC";
    }
    
    function getTreasury() external pure returns (address) {
        return TREASURY;
    }
    
    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }
    
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }
    
    function getPosition(uint256 marketId, address user) external view returns (Position memory) {
        return positions[marketId][user];
    }
    
    function getProposal(uint256 marketId) external view returns (Proposal memory) {
        return proposals[marketId];
    }
}
