pragma solidity ^0.4.24;

contract Remittance {

    address owner;

    struct remittanceNote {
        uint amount;
        address exchanger;
        bool isExist;
    }

    mapping (
        bytes32 => remittanceNote
    ) remittanceNotes;

    // log event
    event LogCreateRemittanceNote(bytes32 puzzle, uint amount, address exchanger, bool isExist);
    event LogWithdraw(bytes32 puzzle, uint amount, address exchanger, bool isExist);

    constructor () public {
        owner = msg.sender;
    }

    function isOwner() private view returns (bool) {
        return msg.sender == owner;
    }

    function isNotExist(bytes32 puzzle) public view returns (bool) {
        return !remittanceNotes[puzzle].isExist;
    }

    function isNotExchanged(bytes32 puzzle) public view returns (bool) {
        return remittanceNotes[puzzle].exchanger == address(0) && remittanceNotes[puzzle].isExist == true;
    }

    function createRemittanceNote(bytes32 puzzle) public payable returns (bool) {
        require(msg.value > 0, "amount should great than zero");
        require(isNotExist(puzzle), "Remittance Exist");

        remittanceNotes[puzzle] = remittanceNote({
            amount: msg.value,
            exchanger: address(0),
            isExist: true
        });

        emit LogCreateRemittanceNote(puzzle, remittanceNotes[puzzle].amount, remittanceNotes[puzzle].exchanger, remittanceNotes[puzzle].isExist);
        return true;
    }

    function getPuzzle(bytes32 passwordA, bytes32 passwordB) public view returns (bytes32) {
        require(passwordA.length > 0, "passwordA can't be blank");
        require(passwordB.length > 0, "passwordB can't be blank");

        return keccak256(abi.encodePacked(passwordA, passwordB, address(this)));
    }

    function withdraw(bytes32 passwordA, bytes32 passwordB) public returns (bool) {
        bytes32 puzzle = getPuzzle(passwordA, passwordB);
        require(isNotExchanged(puzzle), "Remittance Exchanged");

        remittanceNotes[puzzle].exchanger = msg.sender;
        msg.sender.transfer(remittanceNotes[puzzle].amount);
        emit LogWithdraw(puzzle, remittanceNotes[puzzle].amount, remittanceNotes[puzzle].exchanger, remittanceNotes[puzzle].isExist);

        return true;
    }

    // TODO: use softer / reversible methods to stop / pause a contract
    function kill() public {
        if (msg.sender == owner) selfdestruct(owner);
    }
}