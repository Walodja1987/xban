/**
 * Deploy XBAN Contract
 *
 * DEPLOYMENT COMMAND (using Sepolia as an example):
 * `npx hardhat run scripts/deploy/deployXBAN.ts --network sepolia`
 *
 * REQUIRED SETUP:
 * Before first deployment, set these environment variables using hardhat-vars:
 *
 * 1. Network Independent Setup:
 *    - MNEMONIC:          `npx hardhat vars set MNEMONIC`
 *    - ETHERSCAN_API_KEY: `npx hardhat vars set ETHERSCAN_API_KEY`
 *
 * 2. Network Specific Setup:
 *    - ETH_SEPOLIA_TESTNET_URL: `npx hardhat vars set ETH_SEPOLIA_TESTNET_URL`
 *
 * Note: Variable names must match those in hardhat.config.ts
 */

import hre, { HardhatRuntimeEnvironment } from "hardhat";

// Colour codes for terminal prints
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/*//////////////////////////////////////////////////////////////
                            USER INPUTS
//////////////////////////////////////////////////////////////*/

// XBAN contract owner address (recipient of future protocol fees)
// Set to null to use the deployer address as the owner
const xbanOwnerAddress: string | null =
  "0xEd5356Cf46b7cFfbA4ae0bF804E5C810e60e00CC";
// const xbanOwnerAddress: string | null =
//   "0x9AdEFeb576dcF52F5220709c1B267d89d5208D78";
// Example: const xbanOwnerAddress: string | null = null; // use deployer address as the owner

export default async function main(hre: HardhatRuntimeEnvironment) {
  console.log("Starting deployment of XBAN...\n");

  const [,deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Account balance:",
    hre.ethers.formatEther(
      await hre.ethers.provider.getBalance(deployer.address),
    ),
    "ETH\n",
  );

  const ownerAddress = xbanOwnerAddress || deployer.address;

  if (xbanOwnerAddress && !hre.ethers.isAddress(xbanOwnerAddress)) {
    throw new Error(
      `Invalid xbanOwnerAddress: ${xbanOwnerAddress}. Please provide a valid Ethereum address.`,
    );
  }

  console.log(
    `XBAN contract owner will be: ${GREEN}${ownerAddress}${RESET}${
      xbanOwnerAddress ? " (from user input)" : " (deployer address)"
    }\n`,
  );

  const XBAN = await hre.ethers.getContractFactory("XBAN");
  const xban = await XBAN.connect(deployer).deploy(ownerAddress);
  await xban.waitForDeployment();

  const contractAddress = await xban.getAddress();
  console.log("XBAN deployed to: " + `${GREEN}${contractAddress}${RESET}\n`);

  console.log(
    "Waiting 30 seconds before beginning the contract verification to allow the block explorer to index the contract...\n",
  );
  await delay(30000);

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [ownerAddress],
  });

  console.log("\nDeployment and verification completed successfully!");
  console.log(
    `Remember to add the address to constants/addresses.ts under network "${hre.network.name}".`,
  );
}

main(hre)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
