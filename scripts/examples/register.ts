/**
 * Script to register an XBAN for a target address
 *
 * USAGE:
 * `npx hardhat run scripts/examples/register.ts --network <network_name>`
 *
 * EXAMPLE:
 * `npx hardhat run scripts/examples/register.ts --network sepolia`
 *
 * REQUIRED SETUP:
 * 1. Network Independent Setup:
 *    - MNEMONIC:          `npx hardhat vars set MNEMONIC`
 *    - ETHERSCAN_API_KEY: `npx hardhat vars set ETHERSCAN_API_KEY`
 * 2. Network Specific Setup:
 *    - ETH_SEPOLIA_TESTNET_URL: `npx hardhat vars set ETH_SEPOLIA_TESTNET_URL`
 */

import hre from "hardhat";
import { formatEther } from "ethers";
import { XBAN_ADDRESS } from "../../constants/addresses";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";

/*//////////////////////////////////////////////////////////////
                            USER INPUTS
//////////////////////////////////////////////////////////////*/

// Target address to register (null = register the signer)
const targetAddress: string | null = null;

// Signer index that pays the registration fee
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
  const signer = signers[signerIndex];
  const target = targetAddress ?? signer.address;

  if (!hre.ethers.isAddress(target) || target === hre.ethers.ZeroAddress) {
    throw new Error(`Invalid target address: ${target}`);
  }

  const fee = await xban.REGISTRATION_FEE();

  console.log(`\nNetwork: ${GREEN}${networkName}${RESET}`);
  console.log(`XBAN contract: ${GREEN}${contractAddress}${RESET}`);
  console.log(`Registrar: ${GREEN}${signer.address}${RESET}`);
  console.log(`Target: ${GREEN}${target}${RESET}`);
  console.log(`Fee: ${GREEN}${formatEther(fee)} ETH${RESET}\n`);

  if (await xban.isRegistered(target)) {
    const number = await xban.numberOf(target);
    const compact = await xban.xbanOf(target);
    console.log(
      `Target is already registered as number ${number} (${compact})\n`,
    );
    return;
  }

  console.log("Registering...\n");
  const tx = await xban.connect(signer).register(target, { value: fee });
  console.log(`Transaction hash: ${GREEN}${tx.hash}${RESET}\n`);
  await tx.wait();

  const number = await xban.numberOf(target);
  const compact = await xban.xbanOf(target);

  console.log(`${GREEN}✓ Registered successfully!${RESET}\n`);
  console.log(`Account number: ${GREEN}${number}${RESET}`);
  console.log(`Compact XBAN: ${GREEN}${compact}${RESET}\n`);
}

main().catch((error: unknown) => {
  console.error(
    RED + (error instanceof Error ? error.message : String(error)) + RESET,
  );
  process.exitCode = 1;
});
