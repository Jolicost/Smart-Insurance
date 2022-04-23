var Insurance = artifacts.require("Insurance");
module.exports = function(deployer, network, accounts) {
  // You can pass other parameters like gas or change the from
  deployer.deploy(Insurance, { from: accounts[0] });
}