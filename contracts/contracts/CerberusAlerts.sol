// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CerberusAlerts is Ownable {
    enum ThreatLevel {
        INFO,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    struct Alert {
        bytes32 txHash;
        address potentialThreatActor;
        uint256 blockTimestamp;
        string threatSignature;
        ThreatLevel level;
    }

    uint256 public totalAlerts;
    mapping(bytes32 => Alert) public alertsByTxHash;
    mapping(address => uint256) public threatCountByActor;

    event TransactionFlagged(
        bytes32 indexed txHash,
        address indexed potentialThreatActor,
        uint256 timestamp,
        string threatSignature,
        ThreatLevel level
    );

    constructor() Ownable(msg.sender) {}

    function flagTransaction(
        bytes32 _txHash,
        address _potentialThreatActor,
        string memory _threatSignature,
        ThreatLevel _level
    ) public onlyOwner {
        require(alertsByTxHash[_txHash].blockTimestamp == 0, "Alert for this transaction already exists.");

        alertsByTxHash[_txHash] = Alert({
            txHash: _txHash,
            potentialThreatActor: _potentialThreatActor,
            blockTimestamp: block.timestamp,
            threatSignature: _threatSignature,
            level: _level
        });

        threatCountByActor[_potentialThreatActor]++;
        totalAlerts++;

        emit TransactionFlagged(
            _txHash,
            _potentialThreatActor,
            block.timestamp,
            _threatSignature,
            _level
        );
    }
}