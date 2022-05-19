const Insurance = artifacts.require("Insurance");
const ClaimAttack = artifacts.require("ClaimAttack");
const truffleAssert = require('truffle-assertions');
const utils = require('./test.utils.js');
const contractTests = require("./ContractTests.js");

contract('Attack', (accounts) => {
    let insurance
    before(async () => {
        insurance = await Insurance.deployed()
    })

    let claimAttack
    before(async () => {
        claimAttack = await ClaimAttack.deployed()
    })
    utils.accounts = accounts;

    it('Test basic policies home product', async() => {
        await contractTests.testClaimAttack(insurance, claimAttack);
    });

});