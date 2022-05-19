var claimAttack = artifacts.require("ClaimAttack");
module.exports = function(deployer, network, accounts) {
  // You can pass other parameters like gas or change the from
  deployer.deploy(claimAttack, { from: accounts[8] });
}