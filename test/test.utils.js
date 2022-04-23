module.exports = exports = {
    accounts: [],
    // Test accounts
    // Jorge -> 0 
    // IronMan -> 1
    // Eren -> 2
    // Homer -> 3
    // ManoloEscobar -> 4
    // Sabina -> 5
    // Rosalia -> 6
    // Picasso -> 7
    // Ponzi -> 8 
    // Madoff -> 9
    // InsuranceOwner -> Jorge
    getJorge: function() { return exports.accounts[0] },
    getIronMan: function() { return exports.accounts[1] },
    getEren: function() { return exports.accounts[2] },
    getHomer: function() { return exports.accounts[3] },
    getManoloEscobar: function() { return exports.accounts[4] },
    getSabina: function() { return exports.accounts[5] },
    getRosalia: function() { return exports.accounts[6] },
    getPicasso: function() { return exports.accounts[7] },
    getPonzi: function() { return exports.accounts[8] },
    getMadoff: function() { return exports.accounts[9] },
    getInsuranceOwner: function() { return exports.getJorge() },

    // Test products
    getLifeProduct: function() { return "life" },
    getAutosProduct: function() { return "autos" },
    getHomeProduct: function() { return "home" },
    getBoatsProduct: function() { return "boats" },

    getWei: function(ether) { return web3.utils.toWei(ether.toString(), "ether") },
    getEther: function(wei) { return web3.utils.fromWei(wei.toString(), "ether") },

    getDaySeconds: function() { return 86400 },
    getWeekSeconds: function() { return 604800 },

    // Gets active sinisters given a product
    getActiveSinistersByProduct: async function(insurance, product_name, nowTimestamp) {
        const sinisters = await insurance.getSinistersByProduct(product_name);
        var ret = []
        for(var i = 0; i < sinisters.length; i++){
            const sinisterRes = await insurance.getSinister(sinisters[i]);
            assert(sinisterRes[0] == true, "Failed to get sinister back");

            if (sinisterRes[1].end_date > nowTimestamp && parseInt(sinisterRes[1].claim) > 0) {
                ret.push(sinisterRes[1]);
            }
        }

        return ret;
    },

    setNowTimestamp: async function(insurance, ts) {
        await insurance.setNowTimestamp(ts,{from: exports.getInsuranceOwner()});
    }

}
