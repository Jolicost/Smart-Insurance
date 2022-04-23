# Smart-Insurance
This project aims to secure a smart contract written in Solidity by using various auditing tools such as Mythx, Slither and Remix.

The smart contract acts as a decentralized insurance company. Users can add their receipts to a specific product. If any sinister happens, the user can open a dispute for acquiring the product funds. The dispute is solved via voting of all members that have any active policy for the product.

The securing process starts from a vulnerable contract "Insurance.sol", and detects all their vulnerabilities using the mentioned tools. After checking the audit reports, a more secure version of the contract is created.

## Requirements
You can run and test the contracts of this project on any testing environment for Solidity. I personally recommend using the truffle stack, which consists of:

* Truffle cli for compiling and testing the contracts.
* Ganache cli for deploying the local blockchain.
* Solidity IDE (Visual Studio code or other)
* Node.js/npm for installing the packages and dependencies and running them.

## Files and directories
The file structure is explained as follows:

* contracts: contains the .sol contracts of the project.
* test: contains the truffle tests that assert functional behavior.
* migrations: contains the truffle migration files.
* truffle-config.js: truffle config used for the project. You can use your own.
* package.json: additional dependencies that can be installed via npm.

## License
[MIT](https://choosealicense.com/licenses/mit/)