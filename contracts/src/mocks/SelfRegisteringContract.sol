// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IXBAN} from "../interfaces/IXBAN.sol";

/// @title SelfRegisteringContract
/// @notice Mock contract that can register an XBAN for itself via `register`.
contract SelfRegisteringContract {
    IXBAN public xban;

    /// @notice Constructor that optionally registers an XBAN for this contract.
    /// @param _xban The XBAN contract address.
    /// @param registerNow If true, registers `address(this)` during construction.
    constructor(address _xban, bool registerNow) payable {
        xban = IXBAN(_xban);

        if (registerNow) {
            xban.register{value: msg.value}(address(this));
        }
    }

    /// @notice Registers an XBAN for this contract after deployment.
    function register() external payable {
        xban.register{value: msg.value}(address(this));
    }

    /// @notice Accept ETH refunds from XBAN on overpayment.
    receive() external payable {}
}
