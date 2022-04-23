const Insurance = artifacts.require("Insurance");
const truffleAssert = require('truffle-assertions');
const utils = require('./test.utils.js');

contract('Insurance', (accounts) => {
    let insurance
    before(async () => {
        insurance = await Insurance.deployed()
    })
    utils.accounts = accounts;

    

    

    function testBasicTimestamps() {
        it('Test basic timestamps', async () => {

            // Test current timestamp
            const current = await insurance.getNowTimestamp();
            assert(current > 0, "Current timestamp is not greater than zero");

            // Test setting the timestamp
            await utils.setNowTimestamp(insurance, 50);
            const timeSet = await insurance.getNowTimestamp();
            assert(timeSet == 50, "Timestamp not correctly set");

            // Reset timestamp counter
            await utils.setNowTimestamp(insurance, 0);
            const finalTs = await insurance.getNowTimestamp();
            assert(finalTs > current, "Timestamp is not counting");

        })
    }

    function testNonExistentAccess() {
        it('Test non existent accesses', async () => {
            // Test if getting empty products and policies return as expected
            assert((await insurance.getPoliciesByOwner(utils.getJorge())).length == 0, "Found a policy when expected none");
            assert((await insurance.getPolicyByOwnerAndProduct(utils.getLifeProduct(), utils.getJorge()))[0] == false, "Found a policy filtering by product. No policy expected");
            assert((await insurance.getProductByAlias("noproduct"))[0] == false, "Found a product but no product expected");
            assert((await insurance.getPoliciesByProduct(utils.getLifeProduct())).length == 0, "Found products by product");
            assert((await insurance.getPoliciesByProduct("noproduct")).length == 0, "Found products by product");
            let funds = await insurance.checkFunds(utils.getLifeProduct());
            assert(funds[0] == true, "Product not found");
            assert(funds[1] == utils.getWei(0), "Funds should be 0");
            assert((await insurance.checkFunds("noproduct"))[0] == false, "Retrieved funds for an unexistent product");
        })
    }
    
    function testBasicPolicies() {
        it('Test basic policies life product', async () => {
            // Add receipt to life policy
            await insurance.addReceipt(utils.getLifeProduct(), { from: utils.getJorge(), value: utils.getWei(1) });
            const policy = await insurance.getPolicyByOwnerAndProduct(utils.getLifeProduct(), utils.getJorge());
            assert(policy[0] == true, "Policy not found after adding receipt");
            assert(policy[1].id == 1, "Policy id not properly set");
            const now = Math.floor(Date.now() / 1000);
            assert(parseInt(policy[1].timestamp_seconds_coverage_start) <= now, "Policy coverage start is incorrect. Lower than actual timestamp");
            assert(parseInt(policy[1].timestamp_seconds_coverage_end) > now, "Policy coverage end is incorrect. Higher than actual timestamp");
    
            // Add another receipt and check for extended period
            await insurance.addReceipt(utils.getLifeProduct(), { from: utils.getJorge(), value: utils.getWei(1) })
            const policyDoublePeriod = await insurance.getPolicyByOwnerAndProduct(utils.getLifeProduct(), utils.getJorge());
            assert(policyDoublePeriod[0] == true, "Policy not found after adding 2nd receipt");
            assert(policyDoublePeriod[1].timestamp_seconds_coverage_start == policy[1].timestamp_seconds_coverage_start, "Policies have different coverage start dates");
            assert(policyDoublePeriod[1].timestamp_seconds_coverage_end > policy[1].timestamp_seconds_coverage_end, "Coverage period was not extended");

            // Add receipt to life product
            await insurance.addReceipt(utils.getLifeProduct(), { from: utils.getIronMan(), value: utils.getWei(5) });
            const policy3 = await insurance.getPolicyByOwnerAndProduct(utils.getLifeProduct(), utils.getIronMan());
            assert(policy3[0] == true, "Failed to create policy3");
            let policies = await insurance.getPoliciesByOwner(utils.getIronMan());
            assert(policies.length == 1, "Incorrect number of policies");
    
            // Check funds and assert that are correct
            const fundsResponse = await insurance.checkFunds(utils.getLifeProduct());
            assert(fundsResponse[0] == true, "Failed to get funds for product");
            assert(parseInt(fundsResponse[1]) == utils.getWei(3), "Incorrect funds for product");
        })

        it('Test basic policies home product', async() => {
            // Add second policy and expire it
            await utils.setNowTimestamp(insurance, 1);
            // Try to pay a lower prime
            await truffleAssert.reverts(
                insurance.addReceipt(utils.getHomeProduct(), { from: utils.getPicasso(), value: utils.getWei(1) }),
                "ETH is not enough"
            );

            let balanceBefore = await web3.eth.getBalance(utils.getPicasso());
            await insurance.addReceipt(utils.getHomeProduct(), { from: utils.getPicasso(), value: utils.getWei(3) });
            // Product costs 2 but 3 ETH were sent. It should've refunded the remaining amount
            let balanceAfter = await web3.eth.getBalance(utils.getPicasso());
            // Assert balance lost is higher than sent (assuming some gas was used)
            assert(balanceAfter - balanceBefore > -utils.getWei(3), "Incorrect balance after purchase");
    
    
            // Expiry policy and renew contract
            await utils.setNowTimestamp(insurance, 200);
            await insurance.addReceipt(utils.getHomeProduct(), { from: utils.getPicasso(), value: utils.getWei(2) });
            const policy2 = await insurance.getPolicyByOwnerAndProduct(utils.getHomeProduct(), utils.getPicasso());
            assert(policy2[0] == true, "Failed to renew policy");
            assert(parseInt(policy2[1].timestamp_seconds_coverage_start) == 200, "incorrect coverage start for policy 2");
            assert(parseInt(policy2[1].timestamp_seconds_coverage_end) == 300, "incorrect coverage end for policy 2");
    
            
    
        })
    }
    
    function testBasicSinisters() {
        
        it('Test basic sinisters', async () => {
            await utils.setNowTimestamp(insurance, 100);
            // Add policies for autos product
            await insurance.addReceipt(utils.getAutosProduct(), { from: utils.getEren(), value: utils.getWei(5) }); 
            await insurance.addReceipt(utils.getAutosProduct(), { from: utils.getHomer(), value: utils.getWei(3) });

            // Check if product funds are correct
            const autosFunds = await insurance.checkFunds(utils.getAutosProduct());
            assert(autosFunds[0] == true, "Autos product not found");
            assert(parseInt(autosFunds[1]) == utils.getWei(6), "Autos funds are not enough");

            // Declare sinister for eren. Evidence and sha are made up
            await utils.setNowTimestamp(insurance, 101);
            const getPolicy = await insurance.getPolicyByOwnerAndProduct(utils.getAutosProduct(), utils.getEren());
            assert(getPolicy[0] == true, "Failed to get policy back");
            const policy_id = getPolicy[1].id;
            await insurance.declareSinister(policy_id, "Crash with honda", 110, utils.getWei(5), "http://images.com/sinisterImage", 550, { from: utils.getEren() });
    
            // Check funds for the product. Policies add up to 6 ETH. Sinister claims 5 ETH. Active funds (which can be claimed again) should be 1. 5 ETH are reserved
            const autosProduct = await insurance.getProductByAlias(utils.getAutosProduct());
            assert(autosProduct[0] == true, "Product not found");
            assert(parseInt(autosProduct[1].funds) ==  utils.getWei(1), "Incorrect funds for product. Should be 1 ETH");
            assert(parseInt(autosProduct[1].claimedFunds) ==  utils.getWei(5), "Incorrect claimed funds for product. Should be 5 ETH");

            // Test to declare and invalid sinister. 
            // Sender does not have that policy.
            await truffleAssert.reverts(
                insurance.declareSinister(policy_id, "Crash with motorbike", 110, utils.getWei(1), "http://images.com/sinisterImage", 550, { from: utils.getHomer() }),
                "You are not the owner of the policy"
            );

            // Get the current policy for homer
            const getPolicy2 = await insurance.getPolicyByOwnerAndProduct(utils.getAutosProduct(), utils.getHomer());
            assert(getPolicy2[0] == true, "Failed to get policy back");
            const policy_id2 = getPolicy2[1].id;

            // Declare a sinister with a claim higher than available funds
            await truffleAssert.reverts(
                insurance.declareSinister(policy_id2, "Crash with motorbike", 110, utils.getWei(2), "http://images.com/sinisterImage", 550, { from: utils.getHomer() }),
                "Product funds are not enough to cover the sinister"
            );

            // Test to add a sinister when the policy has expired
            // A day of courtesy is added to the ending policy date
            await utils.setNowTimestamp(insurance, 201+utils.getDaySeconds());
            await truffleAssert.reverts(
                insurance.declareSinister(policy_id2, "Crash with motorbike", 110, utils.getWei(1), "http://images.com/sinisterImage", 550, { from: utils.getHomer() }),
                "Current date of out policy coverage range"
            );


            // Try to declare a sinister when another for the same product already exists
            // Day of courtesy considered in declaration range
            await utils.setNowTimestamp(insurance, 205);
            await truffleAssert.reverts(
                insurance.declareSinister(policy_id, "Crash with mazda", 110, utils.getWei(1), "http://images.com/sinisterImage", 550, { from: utils.getEren() }),
                "There is 1 active sinister for this policy"
            );

        })
    }

    function testSinisterVotesAndClaims() {
        it('Test votes and claims', async () => {
            await utils.setNowTimestamp(insurance, 1);
            // Add policies for boats product
            await insurance.addReceipt(utils.getBoatsProduct(), { from: utils.getManoloEscobar(), value: utils.getWei(5) });
            await insurance.addReceipt(utils.getBoatsProduct(), { from: utils.getSabina(), value: utils.getWei(5) });
            await insurance.addReceipt(utils.getBoatsProduct(), { from: utils.getRosalia(), value: utils.getWei(5) });

            // Assert that boats product has 3 policies
            const nPolicies = await insurance.getPoliciesByProduct(utils.getBoatsProduct());
            assert(nPolicies.length == 3, "Failed to add a policy for boats product");

            // Declare a sinister for manolo escobar. Claims 10 ETH.
            const getPolicy = await insurance.getPolicyByOwnerAndProduct(utils.getBoatsProduct(), utils.getManoloEscobar());
            assert(getPolicy[0] == true, "Failed to get policy back");
            const policy_id = getPolicy[1].id;
            await insurance.declareSinister(policy_id, "Hole in boat", 2, utils.getWei(10), "http://images.com/sinisterImage", 550, { from: utils.getManoloEscobar() });

            // Declare a sinister for sabina. Claims 5 ETH.
            const getPolicy2 = await insurance.getPolicyByOwnerAndProduct(utils.getBoatsProduct(), utils.getSabina());
            assert(getPolicy2[0] == true, "Failed to get policy back");
            const policy_id2 = getPolicy2[1].id;
            await insurance.declareSinister(policy_id2, "Stolen sail", 3, utils.getWei(5), "http://images.com/sinisterImage", 550, { from: utils.getSabina() });

            // Check funds for the product. All available funds are claimed
            const boatsProduct = await insurance.getProductByAlias(utils.getBoatsProduct());
            assert(boatsProduct[0] == true, "Product not found");
            assert(parseInt(boatsProduct[1].funds) ==  utils.getWei(0), "Incorrect funds for product. Should be 0 ETH");
            assert(parseInt(boatsProduct[1].claimedFunds) ==  utils.getWei(15), "Incorrect claimed funds for product. Should be 15 ETH");

            

            // Try to get sinisters. No sinister shall be returned since timestamp is set after closing date
            var activeSinisters = await utils.getActiveSinistersByProduct(insurance, utils.getBoatsProduct(),utils.getWeekSeconds()+10);
            assert(activeSinisters.length == 0, "Active sinisters after a week should be 0");
            
            // Try to get sinisters. Now it should return manolo and sabina
            activeSinisters = await utils.getActiveSinistersByProduct(insurance, utils.getBoatsProduct(),5);
            assert(activeSinisters.length == 2, "Active sinisters for boats should be 2");

            const sinisterManolo = activeSinisters[0]
            const sinisterSabina = activeSinisters[1]

            // Set timestamp so sinister dates are active
            await utils.setNowTimestamp(insurance, 5);
            // Try to vote for a non purchased product
            await truffleAssert.reverts(
                insurance.voteSinister(sinisterManolo.id, 1, { from: utils.getEren() }),
                "Sender does not have a policy for that product"
            );

            // Try to vote on own sinister
            await truffleAssert.reverts(
                insurance.voteSinister(sinisterManolo.id, 1, { from: utils.getManoloEscobar() }),
                "The owner of the policy cannot vote"
            );

            // Try to vote for an expired sinister
            await utils.setNowTimestamp(insurance, utils.getWeekSeconds() + 500 + 10);
            await truffleAssert.reverts(
                insurance.voteSinister(sinisterManolo.id, 1, { from: utils.getSabina() }),
                "Sinister voting phase is no longer active"
            );
            await utils.setNowTimestamp(insurance, 1);

            // Try to emit an invalid vote
            await truffleAssert.reverts(
                insurance.voteSinister(sinisterManolo.id, 5, { from: utils.getSabina() }),
                "Invalid vote. Should be 1, 0 or -1"
            );

            // Try to vote for an unexistent sinister
            await truffleAssert.reverts(
                insurance.voteSinister(10000, 1, { from: utils.getSabina() }),
                "Sinister not found"
            );

            // Try to vote using an expired policy
            await utils.setNowTimestamp(insurance, 1000);
            await truffleAssert.reverts(
                insurance.voteSinister(sinisterManolo.id, 1, { from: utils.getSabina() }),
                "The current policy for the sender has expired"
            );

            // Emit a positive vote
            await utils.setNowTimestamp(insurance, 5);
            await insurance.voteSinister(sinisterManolo.id, 1, { from: utils.getSabina() })
            await insurance.voteSinister(sinisterManolo.id, 1, { from: utils.getRosalia() })
            
            // Try to claim a sinister without being closed
            await truffleAssert.reverts(
                insurance.claimSinister(sinisterManolo.id, { from: utils.getManoloEscobar() }),
                "Sinister is not closed yet"
            );

            // Try to claim the sinister using another address
            await utils.setNowTimestamp(insurance, utils.getWeekSeconds() + 5);
            await truffleAssert.reverts(
                insurance.claimSinister(sinisterManolo.id, { from: utils.getSabina() }),
                "You are not the owner of the policy"
            );

            // Claim the prize
            let balanceBefore = await web3.eth.getBalance(utils.getManoloEscobar());
            await insurance.claimSinister(sinisterManolo.id, { from: utils.getManoloEscobar() });
            let balanceAfter = await web3.eth.getBalance(utils.getManoloEscobar());
            
            // Check that transfered eth is correct (discount gas used)
            assert(balanceAfter - balanceBefore >= utils.getWei(9.9), "Transfered funds are incorrect");

            // Check that product funds are correct after withdrawal
            const boatsRes = await insurance.getProductByAlias(utils.getBoatsProduct());
            assert(boatsRes[0] == true, "Failed to get product");
            assert(boatsRes[1].claimedFunds == utils.getWei(5) && boatsRes[1].funds == utils.getWei(0), "Product claimed funds and funds are incorrect");

            // Check that sinister cannot be claimed again
            await truffleAssert.reverts(
                insurance.claimSinister(sinisterManolo.id, { from: utils.getManoloEscobar() }),
                "Sinister has already been claimed"
            );
            
            // Discard the other sinister claim. Make addresses emit a negative vote
            await utils.setNowTimestamp(insurance, 5);
            await insurance.voteSinister(sinisterSabina.id, -1, { from: utils.getManoloEscobar() })
            await insurance.voteSinister(sinisterSabina.id, -1, { from: utils.getRosalia() })
            await utils.setNowTimestamp(insurance, utils.getWeekSeconds() + 5);

            // Try to claim the prize and fail
            balanceBefore = await web3.eth.getBalance(utils.getSabina());
            await insurance.claimSinister(sinisterSabina.id, { from: utils.getSabina() });
            balanceAfter = await web3.eth.getBalance(utils.getSabina());
            assert(balanceAfter - balanceBefore <= utils.getWei(0), "Got reward when other owners voted negative");

            // Check that product funds are correct
            const boatsRes2 = await insurance.getProductByAlias(utils.getBoatsProduct());
            assert(boatsRes2[0] == true, "Failed to get product");
            assert(parseInt(boatsRes2[1].claimedFunds) == utils.getWei(0) && parseInt(boatsRes2[1].funds) == utils.getWei(5), "Product claimed funds and funds are incorrect 2");
        
            // Try to open another sinister for manolo
            await utils.setNowTimestamp(insurance, 5);
            await insurance.declareSinister(policy_id, "Another hole in boat", 2, utils.getWei(5), "http://images.com/sinisterImage", 550, { from: utils.getManoloEscobar() });
        
            // Check funds for the product. All available funds are claimed
            const boatsProduct2 = await insurance.getProductByAlias(utils.getBoatsProduct());
            assert(boatsProduct2[0] == true, "Product not found");
            assert(parseInt(boatsProduct2[1].funds) ==  utils.getWei(0), "Incorrect funds for product. Should be 0 ETH");
            assert(parseInt(boatsProduct2[1].claimedFunds) ==  utils.getWei(5), "Incorrect claimed funds for product. Should be 5 ETH");

            // Try to get sinisters. only 1 sinister returned
            var activeSinisters = await utils.getActiveSinistersByProduct(insurance, utils.getBoatsProduct(),5);
            assert(activeSinisters.length == 1, "Active sinisters should be 1");

            // No votes. Make sinister votation phase end
            await utils.setNowTimestamp(insurance, utils.getWeekSeconds() + 5 + 1);
            // Claim the prize
            balanceBefore = await web3.eth.getBalance(utils.getManoloEscobar());
            await insurance.claimSinister(activeSinisters[0].id, { from: utils.getManoloEscobar() });
            balanceAfter = await web3.eth.getBalance(utils.getManoloEscobar());
            
            // Check that transfered eth is correct (discount gas used)
            assert(balanceAfter - balanceBefore >= utils.getWei(4.9), "Transfered funds are incorrect");
        
        })
    }
    
    testBasicTimestamps();
    testNonExistentAccess();
    testBasicPolicies();
    testBasicSinisters();
    testSinisterVotesAndClaims();

});