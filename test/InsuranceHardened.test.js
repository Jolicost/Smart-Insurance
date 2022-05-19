const InsuranceHardened = artifacts.require("InsuranceHardened");
const truffleAssert = require('truffle-assertions');
const contractTests = require("./ContractTests.js");
const utils = require('./test.utils.js');

contract('InsuranceHardened', (accounts) => {
    let insuranceHardened
    before(async () => {
        insuranceHardened = await InsuranceHardened.deployed()
    })
    utils.accounts = accounts;

    it('Test basic timestamps', async () => {
        await contractTests.testBasicTimestamps(insuranceHardened);
    });

    it('Test non existent accesses', async () => {
        await contractTests.testNonExistentAccess(insuranceHardened);
    });

    it('Test basic policies life product', async() => {
        await contractTests.testBasicPoliciesLifeProduct(insuranceHardened);
    });

    it('Test basic policies home product', async() => {
        await contractTests.testBasicPoliciesHomeProduct(insuranceHardened);
    });

    it('Test basic sinisters', async () => {
        await contractTests.testBasicSinisters(insuranceHardened);
    });

    it('Test votes and claims', async () => {
        await contractTests.testSinisterVotesAndClaims(insuranceHardened);
    });
});