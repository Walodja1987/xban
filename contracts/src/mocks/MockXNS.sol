// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title MockXNS
/// @notice Minimal XNS mock for testing XBAN constructor self-registration.
contract MockXNS {
    mapping(address => string) private _nameOf;

    event NameRegistered(
        string indexed label,
        string indexed namespace,
        address indexed owner
    );

    function registerName(
        string calldata label,
        string calldata namespace
    ) external payable {
        _nameOf[msg.sender] = string(
            abi.encodePacked(label, ".", namespace)
        );

        emit NameRegistered(label, namespace, msg.sender);
    }

    function getName(
        address addr
    ) external view returns (string memory) {
        return _nameOf[addr];
    }
}
