// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IXBAN {
    event Registered(
        uint64 indexed number,
        address indexed target,
        address indexed registrar
    );
    event FeesClaimed(
        address indexed account,
        address indexed recipient,
        uint256 amount
    );

    function register(address target) external payable returns (uint64 number);
    function claimFees(address recipient) external;
    function claimFeesToSelf() external;

    function addressOf(uint64 number) external view returns (address target);
    function numberOf(address target) external view returns (uint64 number);
    function isRegistered(address target) external view returns (bool registered);
    function registrationOpen() external view returns (bool);
    function getPendingFees(address account) external view returns (uint256 amount);
    function nextNumber() external view returns (uint64);

    function xbanOf(address target) external view returns (string memory xban);
    function format(uint64 number) external pure returns (string memory xban);
    function checksumOf(uint64 number) external pure returns (uint8 checksum);
    function accountComponentOf(
        uint64 number
    ) external pure returns (string memory account);

    // OpenZeppelin Ownable2Step functions (inherited, not declared in interface):
    // function transferOwnership(address newOwner) external;
    // function acceptOwnership() external;
    // function owner() external view returns (address);
    // function pendingOwner() external view returns (address);
    // function renounceOwnership() external; // overridden to always revert
}
