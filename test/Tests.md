# Test cases

The following test cases are implemented in [XBAN.test.ts](./XBAN.test.ts).

## XBAN

### Contract initialization

#### Functionality

- Should initialize the contract correctly
  - Owner is the constructor argument
  - `pendingOwner` is zero
  - `nextNumber` starts at 1
  - `registrationOpen()` is true
- Should have correct constants
  - `REGISTRATION_FEE` = 0.0005 ETH
  - `BURN_AMOUNT` = 0.0002 ETH
  - `OWNER_FEE` = 0.0003 ETH
  - `ACCOUNT_LENGTH` = 16
  - `XBAN_LENGTH` = 20
  - `MAX_NUMBER` = 9_999_999_999_999_999
  - `DETH` = canonical DETH address

#### Reverts

- Should revert when owner is `address(0)`

---

### register

#### Functionality

- Should register the next sequential number for the target and emit `Registered`
- Should allow anyone to register any nonzero address
- Should allocate sequential numbers across registrations
- Should burn via DETH (credited to registrar), credit owner fees, and refund excess
- Should credit DETH to the registrar, not the target
- Should assign `MAX_NUMBER` and then reject further registrations (`number space exhausted`)

#### Reverts

- Should revert for zero target
- Should revert for insufficient payment
- Should revert when address is already registered
- Should revert when excess refund fails

---

### Registry views

- Should return zero / false for unregistered lookups (`addressOf`, `numberOf`, `isRegistered`)

---

### Formatting and checksum

#### Functionality

- Should match documented checksum examples (`checksumOf(1) == 23`, `checksumOf(2) == 93`, `checksumOf(4761935072) == 60`)
- Should format compact XBANs with zero-padded account and checksum
  - `format(1) == "XE230000000000000001"`
  - `format(2) == "XE930000000000000002"`
  - `format(4761935072) == "XE600000004761935072"` (`XE 60 0000 0047 6193 5072`)
  - `accountComponentOf(12345) == "0000000000012345"`
- Should return `xbanOf` for registered addresses

#### Reverts

- Should revert `xbanOf` for unregistered addresses
- Should revert format helpers for invalid numbers (0 and `MAX_NUMBER + 1`)

---

### Fees

#### Functionality

- Should claim fees to a recipient (`claimFees`) and to self (`claimFeesToSelf`)
- Should emit `FeesClaimed`

#### Reverts

- Should revert for zero recipient
- Should revert when there are no fees to claim
- Should revert when fee transfer fails

---

### Ownership transfer

#### Functionality

- Should transfer ownership via two-step process
- Should keep accrued fees with the old owner and credit new fees to the new owner

#### Reverts

- Should revert when non-owner transfers
- Should revert when non-pending owner accepts
- Should revert when renouncing ownership

---

### Contract self-registration

- Should register via `SelfRegisteringContract` constructor
- Should register `MockERC20A` in constructor and `MockERC20B` via `register()`
