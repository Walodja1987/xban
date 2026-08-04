// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IXBAN} from "../interfaces/IXBAN.sol";

/// @title MockERC20B
/// @notice Mock ERC20 that demonstrates registering an XBAN for the token
/// contract via a separate `register` function after deployment.
contract MockERC20B is ERC20 {
    IXBAN public immutable xban;

    /// @param _name Token name.
    /// @param _symbol Token symbol.
    /// @param _xban The XBAN contract address.
    /// @param _initialSupply Initial token supply.
    constructor(
        string memory _name,
        string memory _symbol,
        address _xban,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        xban = IXBAN(_xban);
        _mint(msg.sender, _initialSupply);
    }

    /// @notice Registers an XBAN for this contract.
    /// @dev Excess payment is refunded by XBAN to this contract.
    function register() external payable {
        xban.register{value: msg.value}(address(this));
    }

    /// @notice Accept ETH refunds from XBAN on overpayment.
    receive() external payable {}
}
