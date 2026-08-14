// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IXNS {
    function registerName(
        string calldata label,
        string calldata namespace
    ) external payable;
}
