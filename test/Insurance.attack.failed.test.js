const InsuranceHardened = artifacts.require("InsuranceHardened");
const ClaimAttack = artifacts.require("ClaimAttack");
const truffleAssert = require('truffle-assertions');
const utils = require('./test.utils.js');
const contractTests = require("./ContractTests.js");

contract('Attack', (accounts) => {
    let insuranceHardened
    before(async () => {
        insuranceHardened = await InsuranceHardened.deployed()
    })

    let claimAttack
    before(async () => {
        claimAttack = await ClaimAttack.deployed()
    })
    utils.accounts = accounts;

    it('Test basic policies home product', async() => {
        await contractTests.testClaimAttack(insuranceHardened, claimAttack);
    });

});