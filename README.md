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

1. [Overview](#overview)
2. [How It Works](#how-it-works) \
   2.1 [Registration](#registration) \
   2.2 [Resolution](#resolution) \
   2.3 [XBAN Format](#xban-format) \
   2.4 [Checksum](#checksum)
3. [Registration Fee](#registration-fee) \
   3.1 [Fee Distribution](#fee-distribution) \
   3.2 [Why Charge a Fee?](#why-charge-a-fee) \
   3.3 [Number Space](#number-space)
4. [Integration Guide](#integration-guide) \
   4.1 [Resolving an XBAN](#resolving-an-xban) \
   4.2 [Looking Up an XBAN](#looking-up-an-xban) \
   4.3 [Display Format](#display-format) \
   4.4 [User Input](#user-input) \
   4.5 [Checksum Validation](#checksum-validation) \
   4.6 [Smart Contracts](#smart-contracts) \
   4.7 [Gas Efficiency](#gas-efficiency)
5. [Contract Ownership](#contract-ownership) \
   5.1 [Ownership Transfer](#ownership-transfer) \
   5.2 [Protocol Fees](#protocol-fees) \
   5.3 [Why Any Ownership At All?](#why-any-ownership-at-all)
6. [API](#api)
7. [Design Principles](#design-principles)
8. [Future Extensions](#future-extensions)
9. [License and Deployment Policy](#license-and-deployment-policy)

## Overview

XBAN is an Ethereum-native registry that assigns permanent, immutable, banking-style account numbers to Ethereum addresses.

Instead of sending funds to hexadecimal addresses such as

```
0x8ba1f109551bD432803012645Ac136ddd64DBA72
```

users can send funds to a simple numeric identifier such as

```
XE 60 0000 0047 6193 5072
```

Every XBAN permanently resolves to exactly one Ethereum address. Once assigned, an XBAN can never be reassigned, transferred, modified or deleted.

XBAN was designed to make Ethereum payment identifiers feel as familiar as bank account and credit card numbers while remaining fully decentralized and entirely on-chain.

The protocol deliberately follows several concepts established by the International Bank Account Number (IBAN):

- Fixed-length identifiers
- Decimal account numbers
- MOD-97 checksum validation
- Simple human transcription

Unlike traditional banking systems, however, XBAN has no central administrator that can reassign account numbers or modify mappings after registration.

## Relationship with XNS

XBAN is not intended to replace [XNS](https://xns.name).

The two protocols complement one another by serving different purposes.

| Protocol | Purpose |
|----------|---------|
| **XNS** | Human-readable names (e.g. `alice.xns`) |
| **XBAN** | Banking-style payment identifiers (e.g. `XE 60 0000 0047 6193 5072`) |

Both identifiers permanently resolve to the same Ethereum address and can coexist for the same account.

Applications may choose whichever identifier best fits their users. Consumer wallets may primarily display XNS names, whereas banks, custodians, accounting software and enterprise payment systems may prefer XBAN.

## Core Principles

XBAN was designed around a small set of immutable principles.

- **Permanent** — registrations never expire.
- **Immutable** — mappings can never be changed.
- **Sequential** — account numbers are allocated in registration order.
- **Predictable** — users cannot choose or auction account numbers.
- **Decimal-only** — optimized for mobile devices and numeric keypads.
- **Ethereum-native** — every XBAN resolves directly to an Ethereum address.
- **Protocol-neutral** — works equally well for externally owned accounts and smart contracts.
- **Decentralized** — no governance can modify existing mappings.
- **Simple** — intentionally minimal and easy to integrate.

## Why XBAN?

Ethereum addresses are technically robust but difficult for humans to read, verify and communicate.

Human-readable naming systems such as XNS solve memorability, but many financial institutions and payment systems naturally operate using structured numeric account identifiers.

XBAN introduces a familiar banking-style addressing layer for Ethereum without sacrificing decentralization.

Potential applications include:

- crypto wallets
- exchanges
- payment processors
- banks
- custodians
- accounting systems
- payroll platforms
- invoicing software
- enterprise treasury systems

By adopting a fixed-length numeric identifier with an IBAN-style checksum, Ethereum payments become easier to verify manually while remaining entirely self-custodial.

XBAN does not aim to replace existing banking infrastructure.

Instead, it provides a bridge between traditional financial workflows and Ethereum-native payments.

# 2. How It Works

XBAN assigns permanent sequential account numbers to Ethereum addresses.

Anyone can register an XBAN for any nonzero Ethereum address by paying a one-time registration fee.

Each successful registration permanently assigns the next available account number to the specified address.

For example:

| XBAN | Ethereum Address |
|------|------------------|
| XE 60 0000 0047 6193 5072 | `0x1234...abcd` |
| XE 93 0000 0000 0000 0002 | `0xabcd...1234` |
| XE 66 0000 0000 0000 0003 | `0x9876...4321` |

The mapping is immutable.

Once an account number has been assigned:

- it can never be transferred;
- it can never be modified;
- it can never be deleted;
- it can never resolve to another address.

Likewise, an Ethereum address can receive at most one XBAN.

Unlike traditional banking systems, there is no administrator capable of reassigning account numbers after registration.

## Registration

Anyone may register an XBAN for any nonzero Ethereum address.

The caller does **not** become the owner of the address or gain any additional rights over it. The registration merely creates a permanent mapping between the next sequential XBAN and the specified Ethereum address.

For example, Alice may pay the registration fee for Bob's wallet:

```
register(bob)
```

After the transaction confirms, Bob's wallet permanently owns the newly assigned XBAN even though Alice paid the registration fee.

Registrations cannot be front-run in any meaningful way because registrars cannot choose the assigned account number and gain no control over the registered address.

## Resolution

Resolving an XBAN is straightforward.

Applications simply look up the registered account number in the XBAN contract.

```
XE 60 0000 0047 6193 5072
                │
                ▼
      account number = 1
                │
                ▼
     XBAN Registry Contract
                │
                ▼
      0x1234...abcd
```

Resolution always produces exactly one Ethereum address.

If an account number has never been registered, the contract returns `address(0)`.

## XBAN Format

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
| `XE` | Fixed XBAN registry identifier (`E` for Ethereum) |
| `23` | MOD-97 checksum |
| `0000000000000001` | Sixteen-digit sequential account number |

The account number is always displayed using exactly sixteen decimal digits.

Leading zeros are part of the canonical representation.

## Checksum

XBAN uses the same MOD-97 checksum algorithm employed by the International Bank Account Number (IBAN) standard.

The checksum detects nearly all accidental typing mistakes, including most:

- single-digit errors;
- adjacent digit swaps;
- missing digits;
- additional digits.

For account number `1`, checksum generation proceeds as follows.

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

# 3. Registration Fee

Registering an XBAN requires a one-time registration fee of **0.0005 ETH**.

The fee serves several purposes:

- discourages large-scale spam registrations;
- provides sustainable funding for protocol development and ecosystem integrations;
- permanently reserves an XBAN account number for an Ethereum address.

Registrations never expire and require no renewal fees.

## Fee Distribution

The registration fee is distributed as follows:

| Recipient | Amount |
|-----------|--------|
| Burned through DETH | 0.0002 ETH |
| XBAN protocol owner | 0.0003 ETH |

The burned portion is sent to the DETH contract, permanently removing the corresponding ETH from circulation while crediting the payer with DETH according to the DETH protocol.

The protocol fee is credited to the current XBAN contract owner and can be withdrawn at any time using the pull-payment mechanism.

Ownership transfers do not migrate previously accrued fees. Any fees accumulated before an ownership transfer remain claimable by the address to which they were originally credited.

## Why Charge a Fee?

Ethereum addresses can be generated for free.

XBAN intentionally takes a different approach.

Every registered XBAN permanently occupies one account number for the lifetime of the protocol.

Without a registration fee, an attacker could cheaply reserve millions of account numbers, reducing the available address space and making the registry significantly less useful over time.

The one-time registration fee makes such attacks economically expensive while remaining affordable for legitimate users.

Unlike many naming systems, the fee is **not** intended to create scarcity or encourage speculation.

Users cannot choose their account numbers.

Every registration simply receives the next available sequential number.

This eliminates auctions, premium numbers, bidding wars and front-running for desirable identifiers.

## Number Space

XBAN uses sixteen decimal digits for the account-number component.

This provides:

```
10,000,000,000,000,000
```

possible account numbers.

The first registration receives account number:

```
1
```

The final possible registration receives:

```
9,999,999,999,999,999
```

If every account number is eventually assigned, new registrations permanently stop.

Existing XBANs continue to function indefinitely.

Should Ethereum ever require additional account numbers, a future registry could be deployed using a different registry identifier (for example `XB`) while leaving every existing XBAN fully functional forever.

This approach preserves the immutability of existing identifiers while allowing the address space to expand if it ever becomes necessary.

# 4. Integration Guide

XBAN is intentionally simple to integrate.

Applications generally require only two operations:

- Resolve an XBAN to an Ethereum address.
- Display the XBAN associated with an Ethereum address.

Both operations are constant-time lookups.

## Resolving an XBAN

Applications should first validate the checksum locally.

If the checksum is invalid, the XBAN should be rejected before interacting with the blockchain.

After validation, the account number is extracted and resolved using:

```solidity
addressOf(uint64 number)
```

For example:

```
XE 23 0000 0000 0000 0001
```

becomes

```
1
```

which resolves to

```solidity
address target = xban.addressOf(1);
```

If the returned address is

```solidity
address(0)
```

the XBAN has not been registered.

## Looking Up an XBAN

Applications that already know an Ethereum address can retrieve its XBAN using:

```solidity
xbanOf(address target)
```

If the address has not been registered, the function reverts.

Applications may check registration beforehand using:

```solidity
isRegistered(address target)
```

or simply handle the revert.

## Display Format

XBANs should always be stored and transmitted in their canonical compact form.

Example:

```
XE600000004761935072
```

For improved readability, applications are encouraged to display grouped formatting:

```
XE 60 0000 0047 6193 5072
```

Spaces are presentation-only and must not affect checksum validation.

## User Input

Applications should accept XBANs entered with or without spaces.

For example, all of the following should be interpreted identically:

```
XE600000004761935072

XE 60 0000 0047 6193 5072

XE60 0000 0047 6193 5072
```

Applications should ignore whitespace before validating the checksum.

For consistency, applications are encouraged to display XBANs using the grouped format after parsing.

## Checksum Validation

Checksum validation can be performed entirely off-chain.

No smart contract interaction is required.

Wallets and payment applications should validate the checksum before submitting a transaction or performing address resolution.

This allows invalid XBANs to be rejected immediately without consuming gas.

## Smart Contracts

Smart contracts typically do not need to work directly with formatted XBAN strings.

Instead, contracts should exchange the numeric account number:

```solidity
uint64
```

The registry contract provides deterministic conversion functions for formatting and checksum generation where required.

## Gas Efficiency

Resolving an XBAN requires a single storage lookup.

No hashing, iteration or string processing is performed during address resolution.

Likewise, looking up the XBAN assigned to an address requires a single storage lookup.

As a result, the protocol remains inexpensive to integrate both on-chain and off-chain.

# 5. Contract Ownership

XBAN uses OpenZeppelin's `Ownable2Step` contract for protocol ownership.

Ownership exists solely for receiving future protocol fees.

The owner **cannot**:

- modify existing XBAN registrations;
- transfer XBANs between addresses;
- delete registrations;
- change address mappings;
- reassign account numbers;
- modify checksums;
- alter previously registered identifiers.

In other words, ownership provides **administrative control over protocol revenue only**.

## Ownership Transfer

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

`renounceOwnership()` is disabled. Ownership exists solely to receive future protocol fees, and renouncing would permanently strand those fees at `address(0)`.

## Protocol Fees

Each registration credits the protocol fee to the owner **at the time the registration occurs**.

Fees accumulate inside the contract and can later be withdrawn using:

```solidity
claimFees(address recipient)
```

or

```solidity
claimFeesToSelf()
```

Ownership transfers do **not** migrate previously accrued balances.

For example:

1. Alice owns the protocol.
2. Five registrations occur.
3. Alice transfers ownership to Bob.
4. Five additional registrations occur.

Result:

- Alice may claim the fees from the first five registrations.
- Bob may claim the fees from the later five registrations.

This accounting model prevents ownership changes from affecting previously earned protocol revenue.

## Why Any Ownership At All?

XBAN intentionally keeps protocol governance to an absolute minimum.

The protocol nevertheless requires a sustainable funding mechanism to support activities such as:

- wallet integrations;
- exchange integrations;
- payment processor integrations;
- maintenance;
- security reviews;
- documentation.

Rather than introducing governance, treasuries or tokenomics, XBAN simply directs a fixed portion of each registration fee to the protocol owner.

This keeps the protocol economically sustainable while preserving the immutability of every registered XBAN.

# 6. API

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

# 7. Design Principles

XBAN deliberately follows a minimal design philosophy.

Every design decision is guided by the following principles:

- Permanent registrations
- Immutable mappings
- Sequential allocation
- Decimal-only identifiers
- Fixed-length account numbers
- Predictable behavior
- Minimal governance
- Ethereum-native
- Simple integrations
- Long-term stability

Whenever simplicity and additional features conflict, simplicity takes precedence.

# 8. Future Extensions

The XBAN protocol intentionally defines only the core registry.

Future applications may build additional functionality around it, including:

- wallet integrations;
- exchange integrations;
- payment requests;
- invoice standards;
- accounting software;
- banking integrations.

One possible long-term direction is allowing traditional financial institutions to associate existing IBANs with Ethereum wallets while continuing to manage ownership through their existing banking infrastructure.

Such integrations can be developed independently without requiring changes to the XBAN protocol itself.

# 9. License and Deployment Policy

The XBAN smart contract is released under the Business Source License 1.1 (BUSL-1.1).

The canonical XBAN registry is deployed on Ethereum Mainnet.

Applications should integrate the canonical deployment to ensure globally consistent account-number resolution.