// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IXBAN} from "../interfaces/IXBAN.sol";

/// @title MockERC20A
/// @notice Mock ERC20 that demonstrates registering an XBAN for the token
/// contract inside the constructor.
contract MockERC20A is ERC20 {
    /// @notice Constructor that optionally registers an XBAN for this contract.
    /// @param _name Token name.
    /// @param _symbol Token symbol.
    /// @param _xban The XBAN contract address.
    /// @param _initialSupply Initial token supply.
    /// @param registerNow If true, registers `address(this)` during construction.
    constructor(
        string memory _name,
        string memory _symbol,
        address _xban,
        uint256 _initialSupply,
        bool registerNow
    ) ERC20(_name, _symbol) payable {
        _mint(msg.sender, _initialSupply);

        if (registerNow) {
            IXBAN(_xban).register{value: msg.value}(address(this));
        }
    }

    /// @notice Accept ETH refunds from XBAN on overpayment.
    receive() external payable {}
}
