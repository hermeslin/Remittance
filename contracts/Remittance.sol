pragma solidity ^0.4.24;

import "./SafeMath.sol";

contract Remittance {

    using SafeMath for uint;

    address owner;

    struct RemittanceNote {
        bytes32 puzzle;
        uint amount;
        address exchanger;
        bool isExist;
    }

    mapping (
        bytes32 => RemittanceNote
    ) RemittanceNotes;

    mapping (
        address => uint
    ) balances;

    // log event
    event LogCreateRemittanceNote(address owner, uint amount);
    event LogExchangeRemittance(address exchanger, uint amount);
    event LogWithdraw(address receiver, uint amount);

    constructor () public {
        owner = msg.sender;
    }

    function isOwner() private view returns (bool) {
        return msg.sender == owner;
    }

    function isNotExist(bytes32 puzzle) private view returns (bool) {
        return RemittanceNotes[puzzle].isExist == false;
    }

    function isNotExchanged(bytes32 puzzle) private view returns (bool) {
        return RemittanceNotes[puzzle].exchanger == address(0) && RemittanceNotes[puzzle].isExist == true;
    }

    function createRemittanceNote(string passwordA, string passwordB) public payable returns (bool) {
        require(isOwner(), "only owner can create remittance note");
        require(msg.value > 0, "amount should great than zero");

        bytes32 puzzle = getPuzzle(passwordA, passwordB);
        require(isNotExist(puzzle), "Remittance Exist");

        RemittanceNotes[puzzle] = RemittanceNote(puzzle, msg.value, address(0), true);

        emit LogCreateRemittanceNote(msg.sender, msg.value);
        return true;
    }

    function getPuzzle(string passwordA, string passwordB) public pure returns (bytes32) {
        require(bytes(passwordA).length > 0, "passwordA can't be blank");
        require(bytes(passwordB).length > 0, "passwordB can't be blank");

        return keccak256(abi.encodePacked(passwordA, passwordB));
    }

    function getRemittanceNote(bytes32 puzzle) public view returns (bytes32, uint, address, bool) {
        return (
            RemittanceNotes[puzzle].puzzle,
            RemittanceNotes[puzzle].amount,
            RemittanceNotes[puzzle].exchanger,
            RemittanceNotes[puzzle].isExist
        );
    }

    function exchangeRemittance(string passwordA, string passwordB) public returns (bool) {
        bytes32 puzzle = getPuzzle(passwordA, passwordB);
        require(isNotExchanged(puzzle), "Remittance Exchanged");

        RemittanceNotes[puzzle].exchanger = msg.sender;

        // exchanger can accumulating their balance
        balances[msg.sender] = balances[msg.sender].add(RemittanceNotes[puzzle].amount);

        emit LogExchangeRemittance(msg.sender, RemittanceNotes[puzzle].amount);
        return true;
    }

    function withdraw() public payable returns (bool) {
        require (balances[msg.sender] > 0, "reciever has no balance to withdraw");

        uint balance = balances[msg.sender];
        balances[msg.sender] = 0;
        emit LogWithdraw(msg.sender, balance);

        msg.sender.transfer(balance);
        return true;
    }

    function getBalance(address receiver) public view returns (uint) {
        return balances[receiver];
    }

    function kill() public {
        if (msg.sender == owner) selfdestruct(owner);
    }
}