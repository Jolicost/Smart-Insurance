const Insurance = artifacts.require("Insurance");
const truffleAssert = require('truffle-assertions');
const contractTests = require("./ContractTests.js");
const utils = require('./test.utils.js');



contract('Insurance', (accounts) => {
    let insurance
    before(async () => {
        insurance = await Insurance.deployed()
    })
    utils.accounts = accounts;

    it('Test basic timestamps', async () => {
        await contractTests.testBasicTimestamps(insurance);
    });

    it('Test non existent accesses', async () => {
        await contractTests.testNonExistentAccess(insurance);
    });

    it('Test basic policies life product', async() => {
        await contractTests.testBasicPoliciesLifeProduct(insurance);
    });

    it('Test basic policies home product', async() => {
        await contractTests.testBasicPoliciesHomeProduct(insurance);
    });

    it('Test basic sinisters', async () => {
        await contractTests.testBasicSinisters(insurance);
    });

    it('Test votes and claims', async () => {
        await contractTests.testSinisterVotesAndClaims(insurance);
    });
});