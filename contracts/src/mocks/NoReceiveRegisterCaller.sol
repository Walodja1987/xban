// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IXBAN} from "../interfaces/IXBAN.sol";

/// @title NoReceiveRegisterCaller
/// @notice Calls `XBAN.register` but cannot accept ETH, used to test refund failures.
contract NoReceiveRegisterCaller {
    function register(address xban, address target) external payable {
        IXBAN(xban).register{value: msg.value}(target);
    }
}
