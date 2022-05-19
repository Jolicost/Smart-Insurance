// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

// Decentralized insurance contract
contract InsuranceHardened {
    
    struct Vote {
        uint256 id;
        uint256 sinisterId;
        address sender;
        int8 vote;
    }

    struct Sinister {
        uint256 id;
        uint256 policyId;
        string description;
        uint256 claim;
        uint256 date;
        uint256 end_date;
        string url_claim;
        uint256 claim_hash;
    }

    struct Policy {
        uint256 id;
        string productAlias;
        address owner;
        uint256 timestamp_seconds_coverage_start;
        uint256 timestamp_seconds_coverage_end;
    }
    
    struct Product {
        string productAlias;
        uint256 prime;
        uint64 periodSeconds;
        uint256 funds;
        uint256 claimedFunds;
    }

    // Accessors. Sacrifice memory to gain quick access to specific queries
    mapping(string => uint256[]) private policiesByProduct;
    mapping(address => uint256[]) private policiesByOwner;
    mapping(address => mapping(string => uint256)) private policyByAddressAndProduct;

    mapping(string => uint256[]) private sinistersByProduct;
    mapping(uint256 => uint256) private sinisterByPolicy;

    mapping(uint256 => uint256[]) private votesBySinister;
    mapping(address => uint256[]) private votesByAddress;
    mapping(address => mapping(uint256 => uint256)) private voteByAddressAndSinister;

    // Main object storage
    mapping(string => Product) private products;
    mapping(uint256 => Policy) private policies;
    mapping(uint256 => Sinister) private sinisters;
    mapping(uint256 => Vote) private votes;

    // Basic product names
    string[] private productsNames;

    // Indexes
    uint256 private nowTimestamp;
    uint256 private lastPolicyId;
    uint256 private lastSinisterId;
    uint256 private lastVoteId;

    // Testing purposes only
    address private insuranceOwner;

    // Contract constructor. It statically initiates all insurance products with their primes and time periods
    constructor() {
        insuranceOwner = msg.sender;

        string memory autos_name = "autos";
        string memory life_name = "life";
        string memory home_name = "home";
        string memory boats_name = "boats";

        Product memory autos = Product(autos_name,3 ether, 100 seconds, 0, 0);
        Product memory life = Product(life_name,1 ether, 100 seconds, 0, 0);
        Product memory hogar = Product(home_name,2 ether, 100 seconds, 0, 0);
        Product memory boats = Product(boats_name,5 ether, 500 seconds, 0, 0);

        productsNames.push(autos_name);
        productsNames.push(life_name);
        productsNames.push(home_name);
        productsNames.push(boats_name);

        products[home_name] = hogar;
        products[life_name] = life;
        products[autos_name] = autos;
        products[boats_name] = boats;

        // indexes and other storage variables
        nowTimestamp = 0;
        lastPolicyId = 0;
        lastSinisterId = 0;
        lastVoteId = 0;
    }

    // Only owner of the contract can invoke the function that has this modifier
    modifier onlyOwner(){
        require(msg.sender == insuranceOwner);
        _;
    }

    fallback() external payable {

    }

    receive() external payable {
        
    }

    /* #region Test Functions. Remove in deployment */

    // Gets current timestamp for the contract. If no timestamp is set by the owner it uses block timestamp as a reference
    // Check https://solidity-by-example.org/hacks/block-timestamp-manipulation/ 
    function getNowTimestamp() public view returns(uint256) {
        if (nowTimestamp == 0) {
            return block.timestamp;
        } else {
            return nowTimestamp;
        }
    }

    // Sets the current timestamp. Only accessible by contract owner (if set during testing purposes)
    function setNowTimestamp(uint256 ts) external onlyOwner {
        nowTimestamp = ts;
    }

    /* #endregion */

    /* #region Public functions */
    
    // Return all products alias
    function getProducts() external view returns (string[] memory){
        return productsNames;
    }

    // Returns product by alias. 
    // If it doesn't exist returns success=false
    function getProductByAlias(string memory productAlias) external view returns(bool success, Product memory) {
        return (products[productAlias].prime > 0, products[productAlias]);
    }

    // Returns all policies ids by product alias
    function getPoliciesByProduct(string memory productAlias) external view returns (uint256[] memory) {
        return policiesByProduct[productAlias];
    }

    // Returns the policy given the product alias and the owner.
    // If not found then success=false
    function getPolicyByOwnerAndProduct(string memory productAlias, address owner) public view returns(bool success, Policy memory) {

        uint256 pol_id = policyByAddressAndProduct[owner][productAlias];

        // uint256[] memory policiesPro = policiesByProduct[productAlias];
        // uint256[] memory policiesOwn = policiesByOwner[owner];
        // uint256 pol_id = firstIntersection(policiesPro, policiesOwn);

        if (pol_id > 0) {
            return (true, policies[pol_id]);
        } else {
            // Return empty policy
            Policy memory ret = Policy(0,"",address(0),0,0);
            return (false, ret);
        }
    }

    // Returns the policies of a given address
    function getPoliciesByOwner(address owner) external view returns(uint256[] memory)
    {
        return policiesByOwner[owner];  
    }

    // Adds a receipt to a product.
    function addReceipt(string memory productAlias) external payable  {
        (bool productExists, Product memory product) = this.getProductByAlias(productAlias);
        
        // Assert that product exists
        require(productExists, "Product does not exist");

        uint256 amount = msg.value;
        // Assert that recieved ETH is bigger than the product prime
        require(amount >= product.prime, "ETH is not enough");

        // Check of policy exists and retrieve it
        (bool policyExists, Policy memory policy) = getPolicyByOwnerAndProduct(productAlias, msg.sender);
        
        if (!policyExists) {
            // Policy does not exist. Create the policy
            uint256 ts = getNowTimestamp();
            uint256 expiry = ts + product.periodSeconds;
            lastPolicyId = lastPolicyId + 1;
            Policy memory newPolicy = Policy(lastPolicyId, productAlias, msg.sender, ts, expiry);
            addPolicy(productAlias, msg.sender, newPolicy);
        } else {
            // Policy exists. Update coverage dates
            if (isPolicyExpired(policy)) {
                // Expired policy. Rearrange coverage dates
                uint256 ts = getNowTimestamp();
                policy.timestamp_seconds_coverage_start = ts;
                policy.timestamp_seconds_coverage_end = ts + product.periodSeconds;
            } else {
                // Policy active. Extend coverage end date
                policy.timestamp_seconds_coverage_end = policy.timestamp_seconds_coverage_end + product.periodSeconds;
            }
            // update the policy
            updatePolicy(policy);
        }

        // Add balance to product
        product.funds = product.funds + product.prime;
        updateProduct(product);

        // Send back excess ether
        // Reentrancy check: all state variables are set before transfering back excess funds to owner
        if (amount > product.prime) {
            // Paid amount is higher than the prime. Refund the address
            payable(msg.sender).transfer(amount - product.prime);
        }
    }

    // Obtain the available funds for a given product
    function checkFunds(string memory productName) external view returns(bool, uint256) {
        (bool success, Product memory pro) = this.getProductByAlias(productName);
        if (!success) {
            return (false, 0);
        } else {
            return (true, pro.funds);
        }
    }

    // Declares a sinister given an active policy
    function declareSinister(uint256 policyId, string memory description, uint256 timestampSecondsSinisterDate, uint256 claim, string memory url, uint256 sha256Hash) external returns(uint256 sinisterId) {
        // Check that claimed amount is higher than zero
        require(claim > 0, "Claim must be greater than zero");

        // Check that policy exists
        Policy memory policy = policies[policyId];
        require(policy.id > 0, "Policy not found");

        // Check if the owner of the policy is who declared the sinister
        require(msg.sender == policy.owner,"You are not the owner of the policy");

        // There can only be 1 open sinisters for a policy
        uint256 sin_id = sinisterByPolicy[policy.id];
        if (sin_id > 0) {
            Sinister memory sinisterOpen = sinisters[sin_id];
            require(sinisterOpen.claim == 0, "There is 1 active sinister for this policy. Wait for its end and claim it");
        }
        // require(sin_id == 0,"There is 1 active sinister for this policy");

        // Check dates. A margin of 1 day is given to declare the sinister
        uint256 ts = this.getNowTimestamp();
        require(policy.timestamp_seconds_coverage_start <= ts && ts <= (policy.timestamp_seconds_coverage_end + 1 days), "Current date of out policy coverage range");

        // Sinister date must be inside coverage dates
        require(policy.timestamp_seconds_coverage_start <= timestampSecondsSinisterDate && timestampSecondsSinisterDate <= policy.timestamp_seconds_coverage_end, "Sinister date of out policy coverage range");

        // Requiere that product has enough funds to cover the sinister
        (bool productExists, Product memory product) = this.getProductByAlias(policy.productAlias);
        require(productExists, "Product does not exist");
        require(claim <= product.funds, "Product funds are not enough to cover the sinister");

        // Update sinister counter
        lastSinisterId = lastSinisterId + 1;
        Sinister memory sinister = Sinister(lastSinisterId, policyId, description, claim, timestampSecondsSinisterDate, timestampSecondsSinisterDate + 1 weeks, url, sha256Hash);
        addSinister(policy.productAlias, policyId, sinister);

        // Update product funds reservoir for active sinisters
        product.funds = product.funds - claim;
        product.claimedFunds = product.claimedFunds + claim;
        updateProduct(product);

        return sinister.id;
    }

    // Returns true if sinister is active given its id
    function isSinisterActive(uint256 sinisterId) external view returns (bool) {
        Sinister memory sin = sinisters[sinisterId];
        return _isSinisterActive(sin);
    }

    // Returns the sinister given its id
    function getSinister(uint256 sinisterId) external view returns (bool success, Sinister memory sinister) {
        sinister = sinisters[sinisterId];
        success = sinister.id > 0;
        return (success, sinister);
    }

    // Return all sinisters for a specific product
    function getSinistersByProduct(string memory productAlias) external view returns (uint256[] memory) {
        return sinistersByProduct[productAlias];
    }

    // Adds or updates a vote for a sinister
    function voteSinister(uint256 sinisterId, int8 vote) external {
        // Check that emitted vote is valid 
        require(vote == 0 || vote == 1 || vote == -1, "Invalid vote. Should be 1, 0 or -1");

        // Check that sinister exists
        Sinister memory sinister = sinisters[sinisterId];
        require(sinister.id > 0, "Sinister not found");

        // Check that sinister is active
        require(_isSinisterActive(sinister), "Sinister voting phase is no longer active");

        // Check that policy exists
        Policy memory policy = policies[sinister.policyId];
        require(policy.id > 0, "Policy not found");

        // Owner of the policy cannot vote in the sinister
        require(policy.owner != msg.sender,"The owner of the policy cannot vote");

        // Check that sender has an active policy for the product
        (bool success, Policy memory senderPolicy) = this.getPolicyByOwnerAndProduct(policy.productAlias, msg.sender);
        require(success,"Sender does not have a policy for that product");

        // Check that policy is active
        require(!isPolicyExpired(senderPolicy), "The current policy for the sender has expired");

        // Retrieve the vote if it exists
        uint256 vote_id = voteByAddressAndSinister[msg.sender][sinisterId];

        if (vote_id > 0) {
            // Vote exists. Change the vote
            Vote memory voteObj = votes[vote_id];
            voteObj.vote = vote;
            updateVote(voteObj);
        } else {
            // Vote does not exist. Create the vote
            lastVoteId = lastVoteId + 1;
            Vote memory voteObj = Vote(lastVoteId, sinister.id, msg.sender, vote);
            addVote(voteObj, sinisterId, msg.sender);
        }
    }

    // Obtains the votes ids from a sinister
    function getSinisterVotes(uint256 sinisterId) external view returns (uint256[] memory){
        return votesBySinister[sinisterId];
    }

    // Checks the current sinister vote score
    function getSinisterVoteScore(uint256 sinisterId) external view returns(int8) {
        Sinister memory sinister = sinisters[sinisterId];
        require(sinister.id > 0, "sinister does not exist");
        return _getSinisterVoteScore(sinisterId);        
    }

    // Claims the payment of sinister funds
    function claimSinister(uint256 sinisterId) external {
        // Obtain sinister and verify it exists
        Sinister memory sinister = sinisters[sinisterId];
        require(sinister.id > 0, "Sinister not found");

        // Check that sinister hasnt been claimed already
        require(!isSinisterClaimed(sinister), "Sinister has already been claimed");

        // Obtain the policy and verify that the owner is the sender
        Policy memory policy = policies[sinister.policyId];
        require(policy.owner == msg.sender, "You are not the owner of the policy");

        Product memory product = products[policy.productAlias];

        // Check that sinister is closed
        require (isSinisterClosed(sinister), "Sinister is not closed yet");


        int256 score = _getSinisterVoteScore(sinister.id);
        
        uint256 transferAmount = 0;
        if (score >= 0) {
            // Update product
            product.claimedFunds = product.claimedFunds - sinister.claim;
            transferAmount = sinister.claim;
        } else {
            // The owner loses the claim. Update sinister funds
            product.claimedFunds = product.claimedFunds - sinister.claim;
            product.funds = product.funds + sinister.claim;
        }

        // Update sinister so the claim is 0 and thus cannot be claimed again
        // Reentrancy guard: set sinister claim to 0 before transfering funds so requiere check fails 
        sinister.claim = 0;
        updateSinister(sinister);
        updateProduct(product);

        // Transfer funds only if the amount is higher than 0
        if (transferAmount > 0) {
            // The owner wins the claim
            payable(msg.sender).transfer(transferAmount);
        }  
    }



    /* #region Private functions */

    // Update a product
    function updateProduct(Product memory product) private {
        products[product.productAlias] = product;
    }
    // Returns true if the policy has expired
    function isPolicyExpired(Policy memory policy) private view returns(bool) {
        uint256 ts = getNowTimestamp();
        return !(ts >= policy.timestamp_seconds_coverage_start && ts <= policy.timestamp_seconds_coverage_end);
    }

    // Adds the policiy to the persistent storage
    function addPolicy(string memory productAlias, address owner, Policy memory policy) private {
        policiesByProduct[productAlias].push(policy.id);
        policiesByOwner[owner].push(policy.id);
        policyByAddressAndProduct[owner][productAlias] = policy.id;
        policies[policy.id] = policy;
    }

    // Updates policy in storage
    function updatePolicy(Policy memory policy) private {
        policies[policy.id] = policy;
    }

    // Add a sinister to the storage
    function addSinister(string memory productAlias, uint256 policyId, Sinister memory sinister) private {
        sinistersByProduct[productAlias].push(sinister.id);
        sinisterByPolicy[policyId] = sinister.id;
        sinisters[sinister.id] = sinister;
    }

    // Add a vote to the storage
    function addVote(Vote memory vote, uint256 sinisterId, address sender) private {
        uint256 vote_id = vote.id;
        votes[vote.id] = vote;
        votesByAddress[sender].push(vote_id);
        votesBySinister[sinisterId].push(vote_id);
        voteByAddressAndSinister[sender][sinisterId] = vote_id;
    }

    // Update a vote
    function updateVote(Vote memory vote) private {
        votes[vote.id] = vote;
    }

    // Update sinister
    function updateSinister(Sinister memory sinister) private {
        sinisters[sinister.id] = sinister;
    }

    // Check if sinister is active
    function _isSinisterActive(Sinister memory sin) private view returns (bool) {
        require(sin.id > 0,"Sinister not found");
        uint256 ts = this.getNowTimestamp();
        // Sinister is between dates and claimed amount is higher than 0. A 0 claimed amount means that the sinister has already been claimed
        return(ts >= sin.date && ts <= sin.end_date && sin.claim > 0);
    }

    // Returns true if sinister has already been claimed
    function isSinisterClaimed(Sinister memory sin) private pure returns (bool) {
        return sin.claim == 0;
    }

    // Retursn true if sinister voting phase has ended
    function isSinisterClosed(Sinister memory sin) private view returns (bool) {
        uint256 ts = this.getNowTimestamp();
        return(ts > sin.end_date);
    }

    // Returns sinister vote score by adding all existent votes
    // Pre: Sinister already exists
    function _getSinisterVoteScore(uint256 sinisterId) private view returns(int8) {
        uint256[] memory votes_ids = votesBySinister[sinisterId];

        int8 ret = 0;
        for(uint i = 0; i < votes_ids.length; i++) {
            Vote memory vote = votes[votes_ids[i]];
            ret = ret + vote.vote;
        }

        return ret;
    }

    /* #endregion */
}