// Constructor arguments for XBAN: [initialOwner]
// Replace with the address that should receive protocol fees before running xdeploy.
const data = [
  "0x0000000000000000000000000000000000000001", // initialOwner
];
// Export the arguments to be picked up by the `hardhat.config.ts` deployment script
export { data };
