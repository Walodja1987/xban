/**
 * Script to look up the compact XBAN string for an address
 *
 * USAGE:
 * `npx hardhat run scripts/examples/xbanOf.ts --network <network_name>`
 */

import hre from "hardhat";
import { XBAN_ADDRESS } from "../../constants/addresses";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";

/*//////////////////////////////////////////////////////////////
                            USER INPUTS
//////////////////////////////////////////////////////////////*/

// Address to look up (null = use signer)
const targetAddress: string | null = null;
const signerIndex = 0;

async function main() {
  const networkName = hre.network.name;
  const contractAddress = XBAN_ADDRESS[networkName];
  if (!contractAddress) {
    throw new Error(
      `XBAN contract address not set for network: ${networkName}. Please add address to constants/addresses.ts`,
    );
  }

  const xban = await hre.ethers.getContractAt("XBAN", contractAddress);
  const signers = await hre.ethers.getSigners();
  const target = targetAddress ?? signers[signerIndex].address;

  console.log(`\nNetwork: ${GREEN}${networkName}${RESET}`);
  console.log(`XBAN contract: ${GREEN}${contractAddress}${RESET}`);
  console.log(`Address: ${GREEN}${target}${RESET}`);

  const compact = await xban.xbanOf(target);
  const number = await xban.numberOf(target);

  console.log(`Account number: ${GREEN}${number}${RESET}`);
  console.log(`Compact XBAN: ${GREEN}${compact}${RESET}\n`);
}

main().catch((error: unknown) => {
  console.error(
    RED + (error instanceof Error ? error.message : String(error)) + RESET,
  );
  process.exitCode = 1;
});
