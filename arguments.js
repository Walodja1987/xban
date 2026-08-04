// JavaScript module that exports the constructor as an argument list
// Required by the Hardhat plugin `hardhat-etherscan`
// See also here: https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#complex-arguments
//
// XBAN constructor: [initialOwner]
// Replace with the address that should receive protocol fees before verifying.

module.exports = [
  "0x0000000000000000000000000000000000000001", // initialOwner
];
