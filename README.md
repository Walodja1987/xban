# XBAN – The Banking Layer for Ethereum

```
/////////////////////////////////////////////////
//                                             // 
// ___   ___ .______        ___      .__   __. //
// \  \ /  / |   _  \      /   \     |  \ |  | //
//  \  V  /  |  |_)  |    /  ^  \    |   \|  | //
//   >   <   |   _  <    /  /_\  \   |  . `  | //
//  /  .  \  |  |_)  |  /  _____  \  |  |\   | //
// /__/ \__\ |______/  /__/     \__\ |__| \__| //                                           
//                                             //  
/////////////////////////////////////////////////
```

## Table of Contents

1. [Overview](#1-overview)
2. [XBAN Format](#2-xban-format)
3. [Core Principles](#3-core-principles)
4. [How It Works](#4-how-it-works) \
   4.1 [Registration](#41-registration) \
   4.2 [Resolution](#42-resolution) \
   4.3 [Number Space](#43-number-space)
5. [Checksum Calculation](#5-checksum-calculation)
6. [Registration Fee](#6-registration-fee)
7. [Integration Guide](#7-integration-guide)
8. [Contract Ownership](#8-contract-ownership)
9. [API](#9-api)
10. [Deployments](#10-deployments)
11. [License and Deployment Policy](#11-license-and-deployment-policy)

## 1. Overview

Ethereum addresses are technically robust but difficult for humans to read, verify and communicate.

XBAN introduces a familiar banking-style addressing layer for Ethereum.

Instead of sending funds to hexadecimal addresses such as

```
0x8ba1f109551bD432803012645Ac136ddd64DBA72
```

users can send funds to a simple numeric identifier such as

```
XE 60 0000 0047 6193 5072
```

Once an XBAN is assigned to an Ethereum address, it can never be reassigned, transferred, modified or deleted.

The protocol deliberately follows several concepts established by the International Bank Account Number (IBAN):

- Fixed-length identifiers
- Decimal account numbers
- MOD-97 checksum validation
- Simple human transcription

Adopting XBANs allows for a bridge between traditional financial workflows and Ethereum-native payments.

XBAN does not replace or interfere with existing naming systems such as XNS, ENS, WNS or GNS. Those protocols provide human-readable names; XBAN provides banking-style account numbers. An Ethereum address can have both, and applications can display whichever identifier fits the context. 

## 2. XBAN Format

Every XBAN consists of twenty characters:

```
XE600000004761935072
```

For readability, applications are encouraged to display XBANs in grouped form:

```
XE 60 0000 0047 6193 5072
```

The identifier consists of three components:

| Component | Description |
|-----------|-------------|
| `XE` | Fixed XBAN registry identifier |
| `CC` | Two-digit [MOD-97 checksum](#5-checksum-calculation) |
| `N` × 16 | Sixteen-digit sequential account number |

The account number is always displayed using exactly sixteen decimal digits.

Leading zeros are part of the canonical representation.

## 3. Core Principles

XBAN was designed around the following set of principles.

- **Decimal-only** — optimized for mobile devices and numeric keypads.
- **Sequential** — account numbers are allocated in registration order; users cannot choose or auction them.
- **Immutable** — mappings never expire and cannot be changed.
- **Permissionless** — anyone can pay to sponsor an XBAN for any nonzero address, including smart contracts.
- **Simple** — mappings are 1:1, making lookups straightforward.
- **Decentralized** — no governance.

## 4. How It Works

XBAN assigns permanent sequential account numbers to Ethereum addresses. Each address can receive at most one XBAN. Once assigned, the mapping cannot be changed.

### 4.1 Registration

To register an XBAN for your own address, call `register` with that address and pay the one-time fee of **0.0005 ETH**:

```
register(address alice)
```

The next available account number is assigned permanently. Account numbers cannot be chosen.

Anyone may also pay to register an XBAN for another address, including a smart contract. The payer gains no ownership or control over the address or its XBAN — only a permanent mapping is created.

For example, Alice may sponsor Bob:

```
register(address bob)
```

After confirmation, Bob's address holds the newly assigned XBAN.

### 4.2 Resolution

An XBAN resolves to exactly one Ethereum address via a registry lookup.

```
XE 60 0000 0047 6193 5072
                │
                ▼
      account number = 4'761'935'072
                │
                ▼
     XBAN Registry Contract
                │
                ▼
      0x1234...ab07
```

Typical application flow:

1. Strip whitespace.
2. Extract the sixteen-digit account number and validate the checksum — either locally (see [Checksum Calculation](#5-checksum-calculation)) or by comparing against `checksumOf(uint64 number)`.
3. Resolve with `addressOf(uint64 number)`:

```solidity
address target = xban.addressOf(4761935072);
```

If the result is `address(0)`, the XBAN is unregistered or invalid. **Applications must not act on that result to prevent loss of funds.**

To look up the XBAN for a known address:

```solidity
string memory id = xban.xbanOf(target);   // compact form (e.g., XE600000004761935072); reverts if unregistered
uint64 number = xban.numberOf(target);    // 0 if unregistered
bool ok = xban.isRegistered(target);
```

### 4.3 Number Space

XBAN uses sixteen decimal digits for the account-number component.

This provides just below **10 quadrillion** (10<sup>16</sup>-1) possible account numbers.

The first registration receives account number 1.

The final possible registration receives account number 9,999,999,999,999,999.

If every account number is eventually assigned, new registrations permanently stop.

Existing XBANs continue to function indefinitely.

Should Ethereum ever require additional account numbers, a future registry could be deployed using a different registry identifier (for example `XB`) while leaving every existing XBAN fully functional forever.

This approach preserves the immutability of existing identifiers while allowing the address space to expand if it ever becomes necessary.

## 5. Checksum Calculation

XBAN uses the same MOD-97 checksum algorithm employed by the International Bank Account Number (IBAN) standard.

The checksum detects nearly all accidental typing mistakes, including most:

- single-digit errors;
- adjacent digit swaps;
- missing digits;
- additional digits.

For account number 1, checksum generation proceeds as follows.

Start with the provisional XBAN:

```
XE00 0000 0000 0000 0001
```

Move the first four characters to the end:

```
0000 0000 0000 0001 XE00
```

Replace letters using the IBAN mapping:

```
A = 10
B = 11
...
E = 14
...
X = 33
...
Z = 35
```

The resulting decimal sequence is therefore:

```
0000000000000001331400
```

Ignoring leading zeros:

```
1331400
```

Finally,

```
checksum = 98 − (1331400 mod 97)
```

which produces

```
23
```

The complete XBAN is therefore:

```
XE 23 0000 0000 0000 0001
```

A valid XBAN always produces a remainder of **1** when the complete identifier is evaluated modulo **97**, exactly like a valid IBAN.

## 6. Registration Fee

Registering an XBAN requires a one-time registration fee of **0.0005 ETH**.

The fee serves several purposes:

- discourages large-scale spam registrations;
- provides sustainable funding for protocol development and ecosystem integrations;
- permanently reserves an XBAN account number for an Ethereum address.

The registration fee is distributed as follows:

| Recipient | Amount |
|-----------|--------|
| Burned through [DETH](https://github.com/Walodja1987/deth) | 0.0002 ETH / 40% |
| XBAN protocol owner | 0.0003 ETH / 60% |

The burned portion is sent to the DETH contract, permanently removing the corresponding ETH from circulation while crediting the payer with DETH according to the DETH protocol.

The protocol fee is credited to the current XBAN contract owner and can be withdrawn at any time using the pull-payment mechanism.

Ownership transfers do not migrate previously accrued fees. Any fees accumulated before an ownership transfer remain claimable by the address to which they were originally credited.

## 7. Integration Guide

XBAN needs only two lookups: 
* `addressOf` (XBAN → address)
* `xbanOf` / `numberOf` (address → XBAN)

See [Resolution](#42-resolution) for the flow and [API](#9-api) for the full surface.

**Display and input:** Use the compact form (`XE600000004761935072`) as the canonical form. Display the grouped form (`XE 60 0000 0047 6193 5072`) for readability. Accept either on input; ignore whitespace before checksum validation.

## 8. Contract Ownership

Ownership exists solely for receiving future protocol fees.

The owner cannot edit or reassign existing XBANs in any way.

Ownership transfers follow OpenZeppelin's standard two-step process.

The current owner initiates a transfer:

```solidity
transferOwnership(newOwner)
```

The pending owner then accepts ownership:

```solidity
acceptOwnership()
```

Only after acceptance does the ownership transfer become effective.

This mechanism prevents accidental transfers to incorrect or inaccessible addresses.

`renounceOwnership()` is disabled. Renouncing would permanently strand future protocol fees at `address(0)`.

## 9. API

| Function | Description |
|----------|-------------|
| `register(address)` | Registers the next available XBAN for an address. |
| `addressOf(uint64)` | Resolves an XBAN account number to an Ethereum address. |
| `numberOf(address)` | Returns the account number assigned to an address. |
| `isRegistered(address)` | Returns whether an address has an XBAN. |
| `xbanOf(address)` | Returns the compact XBAN assigned to an address. |
| `format(uint64)` | Formats an account number as a compact XBAN. |
| `checksumOf(uint64)` | Calculates the MOD-97 checksum for an account number. |
| `accountComponentOf(uint64)` | Returns the zero-padded sixteen-digit account component. |
| `claimFees(address)` | Claims accrued protocol fees. |
| `claimFeesToSelf()` | Claims fees to the caller. |
| `getPendingFees(address)` | Returns claimable protocol fees. |

## 10. Deployments

| Network | Address |
|---------|---------|
| Ethereum Mainnet | _TBD_ |
| Sepolia | _TBD_ |

## 11. License and Deployment Policy

The XBAN smart contract is released under the Business Source License 1.1 (BUSL-1.1).

The canonical XBAN registry is the Ethereum Mainnet deployment listed under [Deployments](#10-deployments).

Applications should integrate the canonical deployment to ensure globally consistent account-number resolution.