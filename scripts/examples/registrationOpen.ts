/**
 * Script to check whether XBAN registrations are still open
 *
 * USAGE:
 * `npx hardhat run scripts/examples/registrationOpen.ts --network <network_name>`
 */

import hre from "hardhat";
import { XBAN_ADDRESS } from "../../constants/addresses";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

async function main() {
  const networkName = hre.network.name;
  const contractAddress = XBAN_ADDRESS[networkName];
  if (!contractAddress) {
    throw new Error(
      `XBAN contract address not set for network: ${networkName}. Please add address to constants/addresses.ts`,
    );
  }

  const xban = await hre.ethers.getContractAt("XBAN", contractAddress);
  const open = await xban.registrationOpen();
  const nextNumber = await xban.nextNumber();
  const maxNumber = await xban.MAX_NUMBER();

  console.log(`\nNetwork: ${GREEN}${networkName}${RESET}`);
  console.log(`XBAN contract: ${GREEN}${contractAddress}${RESET}`);
  console.log(`nextNumber: ${GREEN}${nextNumber}${RESET}`);
  console.log(`MAX_NUMBER: ${GREEN}${maxNumber}${RESET}`);
  console.log(
    `registrationOpen: ${open ? GREEN + "true" : YELLOW + "false"}${RESET}\n`,
  );
}

main().catch((error: unknown) => {
  console.error(
    RED + (error instanceof Error ? error.message : String(error)) + RESET,
  );
  process.exitCode = 1;
});
