/**
 * Script to resolve an XBAN account number to an Ethereum address
 *
 * USAGE:
 * `npx hardhat run scripts/examples/addressOf.ts --network <network_name>`
 */

import hre from "hardhat";
import { XBAN_ADDRESS } from "../../constants/addresses";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

/*//////////////////////////////////////////////////////////////
                            USER INPUTS
//////////////////////////////////////////////////////////////*/

const number = 1n;

async function main() {
  const networkName = hre.network.name;
  const contractAddress = XBAN_ADDRESS[networkName];
  if (!contractAddress) {
    throw new Error(
      `XBAN contract address not set for network: ${networkName}. Please add address to constants/addresses.ts`,
    );
  }

  const xban = await hre.ethers.getContractAt("XBAN", contractAddress);
  const target = await xban.addressOf(number);

  console.log(`\nNetwork: ${GREEN}${networkName}${RESET}`);
  console.log(`XBAN contract: ${GREEN}${contractAddress}${RESET}`);
  console.log(`Account number: ${GREEN}${number}${RESET}`);

  if (target === hre.ethers.ZeroAddress) {
    console.log(`Address: ${YELLOW}unregistered${RESET}\n`);
  } else {
    console.log(`Address: ${GREEN}${target}${RESET}\n`);
  }
}

main().catch((error: unknown) => {
  console.error(
    RED + (error instanceof Error ? error.message : String(error)) + RESET,
  );
  process.exitCode = 1;
});
