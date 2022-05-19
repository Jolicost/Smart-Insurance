var InsuranceHardened = artifacts.require("InsuranceHardened");
module.exports = function(deployer, network, accounts) {
  // You can pass other parameters like gas or change the from
  deployer.deploy(InsuranceHardened, { from: accounts[0] });
}