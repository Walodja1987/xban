# XBAN Contract Documentation

This is an automatically generated documentation (using `solidity-docgen` package) for the XBAN contract based on the NatSpec comments in the code.

## XBAN


Assigns permanent, sequential, banking-style identifiers to
Ethereum addresses.

Canonical compact format:

    XECCNNNNNNNNNNNNNNNN

Human-readable display format:

    XE CC NNNN NNNN NNNN NNNN

Components:
- `XE`: fixed registry identifier for XBAN v1 (`E` for Ethereum)
- `CC`: two decimal checksum digits calculated using the IBAN MOD-97 method
- `N`: sixteen-digit sequential decimal account number

Example:

    XE 23 0000 0000 0000 0001

Core properties:
- Every valid XBAN maps to exactly one nonzero Ethereum address.
- Every address can receive at most one XBAN.
- Anyone may pay to register any nonzero Ethereum address.
- Registrations are permanent, immutable, and non-transferable.
- Account numbers are allocated sequentially, starting at 1.
- Account number zero is invalid and permanently unassignable.
- Registrants cannot select their account number.
- XBAN mappings cannot be changed, deleted, or redirected.
- The owner controls only the receipt of future protocol fees.
- Ownership transfers use OpenZeppelin's two-step process.

Registration economics:
- Total registration fee: 0.0005 ETH
- Burned through DETH: 0.0002 ETH
- Credited to the current owner: 0.0003 ETH

Accrued fees remain claimable by the address to which they were originally
credited. Transferring ownership affects only future protocol fees.

If the sixteen-digit account-number space is exhausted, new registrations
permanently stop. Existing XBANs remain valid and resolvable indefinitely.






## Functions

### register


Permanently assigns the next sequential XBAN to `target`.

Anyone may register any nonzero Ethereum address. The registrar gains
no ownership, control, transfer rights, or other authority over the
target address or its XBAN.

Overpayment is accepted and refunded.

Fee allocation:
- 0.0002 ETH is burned through DETH and credited by DETH to `msg.sender`.
- 0.0003 ETH is credited to the current XBAN owner.

```solidity
function register(address target) external payable returns (uint64 number)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | Nonzero address to register. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| number | uint64 | Permanently assigned XBAN account number. |

### claimFees


Claims all fees accrued to `msg.sender` and sends them to
`recipient`.

Ownership transfers do not migrate already-accrued balances.

```solidity
function claimFees(address recipient) external
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | Address that will receive the claimed ETH. |


### claimFeesToSelf


Claims all fees accrued to `msg.sender`.

```solidity
function claimFeesToSelf() external
```




### addressOf


Returns the address associated with an XBAN account number.

Returns `address(0)` if the account number is unregistered, zero, or
outside the valid XBAN number range.

```solidity
function addressOf(uint64 number) external view returns (address target)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| number | uint64 | XBAN account number. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | Permanently associated address, or address(0). |

### numberOf


Returns the XBAN account number assigned to an address.

Returns zero if the address is not registered.

```solidity
function numberOf(address target) external view returns (uint64 number)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | Address to look up. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| number | uint64 | Assigned XBAN account number, or zero. |

### isRegistered


Returns whether an address has a registered XBAN.

The zero address always returns false.

```solidity
function isRegistered(address target) external view returns (bool registered)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | Address to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| registered | bool | True if the address has an XBAN. |

### registrationOpen


Returns whether additional registrations are possible.

```solidity
function registrationOpen() external view returns (bool)
```




### getPendingFees


Returns the protocol fees claimable by `account`.

```solidity
function getPendingFees(address account) external view returns (uint256 amount)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Address whose pending balance should be returned. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Pending ETH amount. |

### xbanOf


Returns the canonical compact XBAN for a registered address.

Example compact form:

    XE230000000000000001

Human-readable display:

    XE 23 0000 0000 0000 0001

```solidity
function xbanOf(address target) external view returns (string xban)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | Registered address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| xban | string | Canonical compact XBAN without spaces. |

### format


Formats an account number as a canonical compact XBAN.

Formatting does not require the account number to have been assigned.
This permits deterministic testing and precomputation.

Account number zero and values above MAX_NUMBER are invalid.

```solidity
function format(uint64 number) public pure returns (string xban)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| number | uint64 | Numeric XBAN account number. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| xban | string | Canonical compact XBAN without spaces. |

### checksumOf


Returns the IBAN-style MOD-97 checksum for an account number.

Examples:
- `checksumOf(1) == 23`
- `checksumOf(2) == 93`

```solidity
function checksumOf(uint64 number) external pure returns (uint8 checksum)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| number | uint64 | Numeric XBAN account number. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| checksum | uint8 | Checksum represented numerically. |

### accountComponentOf


Returns the zero-padded sixteen-digit account component.

Example:

    accountComponentOf(12345) == "0000000000012345"

```solidity
function accountComponentOf(uint64 number) external pure returns (string account)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| number | uint64 | Numeric XBAN account number. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | string | Sixteen-digit account-number component. |


## Events

### Registered


Emitted whenever an XBAN is permanently assigned.

```solidity
event Registered(uint64 number, address target, address registrar)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| number | uint64 | Sequential XBAN account number. |
| target | address | Address permanently associated with the XBAN. |
| registrar | address | Address that paid for the registration. |



### FeesClaimed


Emitted when accumulated protocol fees are claimed.

```solidity
event FeesClaimed(address account, address recipient, uint256 amount)
```


#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Address whose accrued balance was claimed. |
| recipient | address | Address that received the ETH. |
| amount | uint256 | Amount claimed. |






## State Variables

### REGISTRATION_FEE


Total ETH required for one registration.

```solidity
uint256 REGISTRATION_FEE
```





### BURN_AMOUNT


Portion of each registration fee burned through DETH.

```solidity
uint256 BURN_AMOUNT
```





### OWNER_FEE


Portion of each registration fee credited to the owner.

```solidity
uint256 OWNER_FEE
```





### ACCOUNT_LENGTH


Number of decimal digits in the account-number component.

```solidity
uint256 ACCOUNT_LENGTH
```





### XBAN_LENGTH


Length of a compact XBAN: 2 prefix + 2 checksum + 16 account.

```solidity
uint256 XBAN_LENGTH
```





### MAX_NUMBER


Largest account number representable by sixteen decimal digits.

10^16 - 1 = 9,999,999,999,999,999

```solidity
uint64 MAX_NUMBER
```





### DETH


DETH contract used to burn part of each registration fee.

```solidity
address DETH
```





### nextNumber


Account number assigned to the next registration.

Starts at 1. After the final number is assigned, this becomes
MAX_NUMBER + 1, which represents permanent exhaustion.

```solidity
uint64 nextNumber
```







