/**
 * Script to format an account number as a compact XBAN (pure; no registration required)
 *
 * USAGE:
 * `npx hardhat run scripts/examples/format.ts --network <network_name>`
 */

import hre from "hardhat";
import { XBAN_ADDRESS } from "../../constants/addresses";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
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
  const compact = await xban.format(number);
  const checksum = await xban.checksumOf(number);
  const account = await xban.accountComponentOf(number);

  console.log(`\nNetwork: ${GREEN}${networkName}${RESET}`);
  console.log(`XBAN contract: ${GREEN}${contractAddress}${RESET}`);
  console.log(`Account number: ${GREEN}${number}${RESET}`);
  console.log(`Account component: ${GREEN}${account}${RESET}`);
  console.log(`Checksum: ${GREEN}${checksum.toString().padStart(2, "0")}${RESET}`);
  console.log(`Compact XBAN: ${GREEN}${compact}${RESET}\n`);
}

main().catch((error: unknown) => {
  console.error(
    RED + (error instanceof Error ? error.message : String(error)) + RESET,
  );
  process.exitCode = 1;
});
