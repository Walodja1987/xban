// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {IDETH} from "./interfaces/IDETH.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title XBAN
/// @author Wladimir Weinbender (DIVA Technologies AG)
///
/// @notice Assigns permanent, sequential, banking-style identifiers to
/// Ethereum addresses.
///
/// Canonical compact format:
///
///     XECCNNNNNNNNNNNNNNNN
///
/// Human-readable display format:
///
///     XE CC NNNN NNNN NNNN NNNN
///
/// Components:
/// - `XE`: fixed registry identifier for XBAN
/// - `CC`: two decimal checksum digits calculated using the IBAN MOD-97 method
/// - `N`: sixteen-digit sequential decimal account number
///
/// Example:
///
///     XE 60 0000 0047 6193 5072
///
/// Core properties:
/// - Every valid XBAN maps to exactly one nonzero Ethereum address.
/// - Every address can receive at most one XBAN.
/// - Anyone may pay to register any nonzero Ethereum address.
/// - Registrations are permanent, immutable, and non-transferable.
/// - Account numbers are allocated sequentially, starting at 1 (XE 23 0000 0000 0000 0001).
/// - Registrants cannot select their account number.
/// - The zero address is unassignable because it is the unregistered-address sentinel.
/// - The owner controls only the receipt of future protocol fees.
/// - Ownership transfers use OpenZeppelin's two-step process.
/// - Renouncing ownership is disabled so future fees cannot be permanently
///   stranded at address(0).
///
/// Registration economics:
/// - Total registration fee: 0.0005 ETH
/// - Burned through DETH contract: 0.0002 ETH
/// - Credited to the current owner: 0.0003 ETH
///
/// Accrued fees remain claimable by the address to which they were originally
/// credited. Transferring ownership affects only future protocol fees.
///
/// If the sixteen-digit account-number space is exhausted (just under ten
/// quadrillion (10^16 − 1) registrations) new registrations permanently stop.
/// Existing XBANs remain valid and resolvable indefinitely. Further growth
/// requires a new contract deployment with a different registry prefix.
contract XBAN is Ownable2Step, ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @dev XBAN account number to associated address.
    /// The zero address means the account number is not registered.
    mapping(uint64 number => address target) private _addressOf;

    /// @dev Address to associated XBAN account number.
    /// A value of zero means that the address is not registered.
    mapping(address target => uint64 number) private _numberOf;

    /// @dev Pull-based protocol fees credited to current and former owners.
    mapping(address account => uint256 amount) private _pendingFees;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Total ETH required for one registration.
    uint256 public constant REGISTRATION_FEE = 0.0005 ether;

    /// @notice Portion of each registration fee burned through DETH.
    uint256 public constant BURN_AMOUNT = 0.0002 ether;

    /// @notice Portion of each registration fee credited to the owner.
    uint256 public constant OWNER_FEE = REGISTRATION_FEE - BURN_AMOUNT; // 0.0003 ETH

    /// @notice Number of decimal digits in the account-number component.
    uint256 public constant ACCOUNT_LENGTH = 16;

    /// @notice Length of a compact XBAN: 2 prefix + 2 checksum + 16 account.
    uint256 public constant XBAN_LENGTH = 20;

    /**
     * @notice Largest account number representable by sixteen decimal digits.
     *
     * 10^16 - 1 = 9,999,999,999,999,999 (just under ten quadrillion)
     */
    uint64 public constant MAX_NUMBER = 9_999_999_999_999_999;

    /// @notice DETH contract used to burn part of each registration fee.
    address public constant DETH =
        0xE46861C9f28c46F27949fb471986d59B256500a7;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /**
     * @notice Account number assigned to the next registration.
     *
     * Starts at 1. After the final number is assigned, this becomes
     * MAX_NUMBER + 1, which represents permanent exhaustion.
     */
    uint64 public nextNumber = 1;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted whenever an XBAN is assigned.
    /// @param number Sequential XBAN account number.
    /// @param target Address associated with the XBAN.
    /// @param registrar Address that paid for the registration.
    event Registered(
        uint64 indexed number,
        address indexed target,
        address indexed registrar
    );

    /// @notice Emitted when accumulated protocol fees are claimed.
    /// @param account Address whose accrued balance was claimed.
    /// @param recipient Address that received the ETH.
    /// @param amount Amount claimed.
    event FeesClaimed(
        address indexed account,
        address indexed recipient,
        uint256 amount
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param initialOwner Initial owner and recipient of future protocol fees.
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Renouncing ownership is disabled.
    ///
    /// Ownership exists solely to receive future protocol fees. Setting the
    /// owner to `address(0)` would permanently strand those fees.
    function renounceOwnership() public pure override {
        revert("XBAN: renounce disabled");
    }

    // =========================================================================
    // State-modifying functions
    // =========================================================================

    /// @notice Assigns the next sequential XBAN to `target`.
    ///
    /// Anyone may register any nonzero Ethereum address. The registrar gains
    /// no ownership, control, transfer rights, or other authority over the
    /// target address or its XBAN.
    ///
    /// Overpayment is accepted and refunded.
    ///
    /// Fee allocation:
    /// - 0.0002 ETH is burned through DETH and credited by DETH to `msg.sender`.
    /// - 0.0003 ETH is credited to the current XBAN owner.
    ///
    /// @param target Nonzero address to register.
    /// @return number Assigned XBAN account number.
    function register(
        address target
    ) external payable nonReentrant returns (uint64 number) {
        require(target != address(0), "XBAN: zero target");
        require(
            msg.value >= REGISTRATION_FEE,
            "XBAN: insufficient payment"
        );
        require(
            _numberOf[target] == 0,
            "XBAN: address already registered"
        );

        number = nextNumber;

        require(
            number <= MAX_NUMBER,
            "XBAN: number space exhausted"
        );

        _addressOf[number] = target;
        _numberOf[target] = number;

        unchecked {
            /*
             * MAX_NUMBER + 1 fits safely inside uint64 and represents the
             * permanent exhaustion state.
             */
            nextNumber = number + 1;
        }

        emit Registered(number, target, msg.sender);

        _processETHPayment();
    }

    /// @notice Claims all fees accrued to `msg.sender` and sends them to
    /// `recipient`.
    ///
    /// Ownership transfers do not migrate already-accrued balances.
    ///
    /// @param recipient Address that will receive the claimed ETH.
    function claimFees(address recipient) external nonReentrant {
        require(recipient != address(0), "XBAN: zero recipient");

        _claimFees(recipient);
    }

    /// @notice Claims all fees accrued to `msg.sender`.
    function claimFeesToSelf() external nonReentrant {
        _claimFees(msg.sender);
    }

    // =========================================================================
    // Registry views
    // =========================================================================

    /// @notice Returns the address associated with an XBAN account number.
    ///
    /// Returns `address(0)` when there is no registration for `number`.
    /// That includes account number zero and values outside the valid range,
    /// which are never assigned. `address(0)` itself is unassignable, so this
    /// return value is never a real mapping.
    ///
    /// @param number XBAN account number.
    /// @return target Permanently associated address, or address(0).
    function addressOf(
        uint64 number
    ) external view returns (address target) {
        return _addressOf[number];
    }

    /// @notice Returns the XBAN account number assigned to an address.
    ///
    /// Returns zero if the address is not registered.
    ///
    /// @param target Address to look up.
    /// @return number Assigned XBAN account number, or zero.
    function numberOf(
        address target
    ) external view returns (uint64 number) {
        return _numberOf[target];
    }

    /// @notice Returns whether an address has a registered XBAN.
    ///
    /// The zero address always returns false as it's unassignable.
    ///
    /// @param target Address to check.
    /// @return registered True if the address has an XBAN.
    function isRegistered(
        address target
    ) external view returns (bool registered) {
        return _numberOf[target] != 0;
    }

    /// @notice Returns whether additional registrations are possible.
    function registrationOpen() external view returns (bool) {
        return nextNumber <= MAX_NUMBER;
    }

    /// @notice Returns the protocol fees claimable by `account`.
    ///
    /// @param account Address whose pending balance should be returned.
    /// @return amount Pending ETH amount.
    function getPendingFees(
        address account
    ) external view returns (uint256 amount) {
        return _pendingFees[account];
    }

    // =========================================================================
    // XBAN formatting
    // =========================================================================

    /// @notice Returns the canonical compact XBAN for a registered address.
    ///
    /// Example compact form:
    ///
    ///     XE230000000000000001
    ///
    /// Human-readable display:
    ///
    ///     XE 23 0000 0000 0000 0001
    ///
    /// @param target Registered address.
    /// @return xban Canonical compact XBAN without spaces.
    function xbanOf(
        address target
    ) external view returns (string memory xban) {
        uint64 number = _numberOf[target];

        require(number != 0, "XBAN: address not registered");

        return format(number);
    }

    /// @notice Formats an account number as a canonical compact XBAN.
    ///
    /// Example compact form:
    ///
    ///     XE230000000000000001
    ///
    /// Human-readable display:
    ///
    ///     XE 23 0000 0000 0000 0001
    ///
    /// Formatting does not require the account number to have been assigned.
    /// This permits deterministic testing and precomputation.
    ///
    /// Account number zero and values above MAX_NUMBER are invalid.
    ///
    /// @param number Numeric XBAN account number.
    /// @return xban Canonical compact XBAN without spaces.
    function format(
        uint64 number
    ) public pure returns (string memory xban) {
        _validateNumber(number);

        bytes memory account = _encodeAccountNumber(number);
        uint8 checksum = _checksum(number);

        bytes memory result = new bytes(XBAN_LENGTH);

        // Fixed XBAN prefix: XE
        result[0] = 0x58; // X
        result[1] = 0x45; // E

        /*
         * Convert the numeric checksum into two ASCII characters.
         *
         * Example: checksum 23
         *
         * checksum / 10 = 2  -> ASCII "2"
         * checksum % 10 = 3  -> ASCII "3"
         *
         * ASCII "0" has value 48, so adding 48 converts a numeric
         * digit from 0 through 9 into its corresponding ASCII byte.
         *
         * A checksum below 10 is automatically zero-padded:
         *
         * checksum 8:
         * 8 / 10 = 0 -> "0"
         * 8 % 10 = 8 -> "8"
         */
        result[2] = bytes1(uint8(48 + checksum / 10));
        result[3] = bytes1(uint8(48 + checksum % 10));

        // Append the sixteen decimal account-number characters.
        for (uint256 i; i < ACCOUNT_LENGTH; ) {
            result[i + 4] = account[i];

            unchecked {
                ++i;
            }
        }

        return string(result);
    }

    /// @notice Returns the IBAN-style MOD-97 checksum for an account number.
    ///
    /// Examples:
    /// - `checksumOf(1) == 23`
    /// - `checksumOf(2) == 93`
    ///
    /// @param number Numeric XBAN account number.
    /// @return checksum Checksum represented numerically.
    function checksumOf(
        uint64 number
    ) external pure returns (uint8 checksum) {
        _validateNumber(number);

        return _checksum(number);
    }

    /// @notice Returns the zero-padded sixteen-digit account component.
    ///
    /// Example:
    ///
    ///     accountComponentOf(12345) == "0000000000012345"
    ///
    /// @param number Numeric XBAN account number.
    /// @return account Sixteen-digit account-number component.
    function accountComponentOf(
        uint64 number
    ) external pure returns (string memory account) {
        _validateNumber(number);

        return string(_encodeAccountNumber(number));
    }

    // =========================================================================
    // Internal payment functions
    // =========================================================================

    /// @dev Burns part of the registration fee, credits the protocol fee,
    /// and refunds any excess payment.
    function _processETHPayment() private {
        /*
         * Match XNS behavior: DETH credits the payer or sponsor that funded
         * the registration.
         */
        IDETH(DETH).burn{value: BURN_AMOUNT}(msg.sender);

        /*
         * Credit the owner at registration time. A later ownership transfer
         * does not migrate this already-accrued balance.
         */
        _pendingFees[owner()] += OWNER_FEE;

        uint256 excess = msg.value - REGISTRATION_FEE;

        if (excess > 0) {
            (bool success, ) = msg.sender.call{value: excess}("");
            require(success, "XBAN: refund failed");
        }
    }

    /// @dev Claims all fees accrued to msg.sender.
    function _claimFees(address recipient) private {
        uint256 amount = _pendingFees[msg.sender];

        require(amount > 0, "XBAN: no fees to claim");

        _pendingFees[msg.sender] = 0;

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "XBAN: fee transfer failed");

        emit FeesClaimed(msg.sender, recipient, amount);
    }

    // =========================================================================
    // Internal formatting and checksum functions
    // =========================================================================

    /// @dev Rejects zero and values outside the sixteen-digit account space.
    function _validateNumber(uint64 number) private pure {
        require(
            number > 0 && number <= MAX_NUMBER,
            "XBAN: invalid number"
        );
    }

    /// @dev Encodes an XBAN account number as exactly sixteen zero-padded
    /// ASCII decimal digits.
    ///
    /// The XBAN account number is stored and processed as a `uint64`, but the
    /// formatted XBAN must contain a fixed-width sixteen-character decimal
    /// account component.
    ///
    /// For example, the numeric account number:
    ///
    ///     12345
    ///
    /// is converted into:
    ///
    ///     "0000000000012345"
    ///
    /// The function fills the output from right to left. In each iteration:
    ///
    /// 1. `remaining % 10` extracts the rightmost decimal digit.
    /// 2. Adding 48 converts that digit into its ASCII character.
    /// 3. `remaining /= 10` removes the processed rightmost digit.
    ///
    /// Once `remaining` reaches zero, the remaining positions are filled
    /// with ASCII `"0"`, producing the required leading-zero padding.
    ///
    /// @param number Numeric XBAN account number.
    /// @return encoded Exactly sixteen ASCII decimal digits.
    function _encodeAccountNumber(
        uint64 number
    ) private pure returns (bytes memory encoded) {
        encoded = new bytes(ACCOUNT_LENGTH);

        uint256 remaining = number;

        for (uint256 i = ACCOUNT_LENGTH; i != 0; ) {
            unchecked {
                --i;
            }

            encoded[i] = bytes1(
                uint8(48 + (remaining % 10))
            );

            remaining /= 10;
        }
    }

    /// @dev Calculates the two-digit checksum using the IBAN MOD-97 method.
    ///
    /// @param number The numeric XBAN account number represented in the final
    /// identifier as exactly sixteen zero-padded decimal digits. It excludes
    /// the `XE` registry identifier and the two checksum digits.
    ///
    /// Example for account number 1:
    ///
    ///     0000 0000 0000 0001
    ///
    /// Checksum generation begins with the provisional XBAN:
    ///
    ///     XE00 0000 0000 0000 0001
    ///
    /// Following the IBAN procedure, the first four characters are moved
    /// to the end:
    ///
    ///     0000 0000 0000 0001 XE00
    ///
    /// Letters are converted using A = 10 through Z = 35:
    ///
    ///     X = 33
    ///     E = 14
    ///
    /// This produces the decimal sequence:
    ///
    ///     0000000000000001331400
    ///
    /// Ignoring leading zeros, this is:
    ///
    ///     1331400
    ///
    /// Because leading zeros do not affect the numeric value, the resulting
    /// decimal number can be constructed directly as:
    ///
    ///     number * 1,000,000 + 331,400
    ///
    /// The function applies modulo 97 once to this resulting decimal number
    /// and calculates:
    ///
    ///     checksum = 98 - (resultingNumber mod 97)
    ///
    /// A completed valid XBAN produces a remainder of 1 modulo 97.
    function _checksum(
        uint64 number
    ) private pure returns (uint8 checksum) {
        uint256 resultingNumber =
            uint256(number) * 1_000_000 +
            331_400;

        return uint8(98 - (resultingNumber % 97));
    }
}