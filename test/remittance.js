import { default as Promise } from 'bluebird';
import Chai from "chai";
import ChaiAsPromised from "chai-as-promised";

Chai.use(ChaiAsPromised);
const { expect } = Chai;

const Remittance = artifacts.require("Remittance");

Promise.promisifyAll(web3.eth, { suffix: 'Promise' });

const calculateTransactionFee = async (transaction) => {
  let tx = await web3.eth.getTransactionPromise(transaction.tx);
  return tx.gasPrice.mul(transaction.receipt.gasUsed);
}

const VM_ERROR = {
  revert: 'VM Exception while processing transaction: revert '
};

contract('Remittance', async (accounts) => {

  const [alice, bob] = accounts;

  let remittance;
  beforeEach('Deploy new contract instance', async function () {
    remittance = await Remittance.new({ from: alice });
  });

  describe('.createRemittanceNote(): owner can create a new remittance note', function () {
    it('simulate create a new remittance note', async function () {
      let simulate = await remittance.createRemittanceNote.call('1234', '456', { from: alice, value: 10});
      assert.equal(simulate, true);
    });

    it('owner create a new remittance note', async function () {
      let balance = await web3.eth.getBalancePromise(alice);
      let transaction = await remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 });
      let transactionFee = await calculateTransactionFee(transaction);
      let balanceFinal = await web3.eth.getBalancePromise(alice);

      assert.equal(balanceFinal.plus(transactionFee).minus(balance).abs().toString(), '10');
    });
  });

  describe('.getRemittanceNote(): after create a new remittance note, get remittance note info', function () {
    beforeEach('create a new remittance note first ', async function () {
      await remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 });
    });

    it('get remittance note when give the correct password', async function () {
      await remittance.exchangeRemittance('1234', '456', { from: bob });

      let puzzle = await remittance.getPuzzle('1234', '456');
      let [puzzleHash, amount, exchanger, isExist] = await remittance.getRemittanceNote(puzzle);

      assert.equal(puzzleHash, '0x9e5d20d4ac255ad9dab315742032240699e141141894da79abf075356b8ce141');
      assert.equal(amount, 10);
      assert.equal(exchanger, bob);
      assert.equal(isExist, true);
    })
  });

  describe('.exchangeRemittance(): someone who knows the password can exchange remittance', function () {
    beforeEach('create a new remittance note first ', async function () {
      await remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 });
    });

    it('simulate exchange the remittance', async function () {
      let simulate = await remittance.exchangeRemittance.call('1234', '456');
      assert.equal(simulate, true);
    });

    it('exchange the remittance and store balance in the contract state', async function () {
      await remittance.exchangeRemittance('1234', '456', {from: bob});
      let receiverBalanceState = await remittance.getBalance(bob);
      assert.equal(receiverBalanceState, 10);
    });
  })

  describe('.withdraw(): when exchange remittance, someone can take money back', function () {
    beforeEach('prepare data', async () => {
      await remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 });
      await remittance.exchangeRemittance('1234', '456', { from: bob });
    });

    it('simulate withdraw', async function () {
      let simulate = await remittance.withdraw.call({ from: bob });
      assert(simulate, true);
    });

    it('should take money back', async function () {
      let balance = await web3.eth.getBalancePromise(bob);
      let transaction = await remittance.withdraw({ from: bob });
      let transactionFee = await calculateTransactionFee(transaction);
      let balanceFinal = await web3.eth.getBalancePromise(bob);

      assert.equal(balanceFinal.plus(transactionFee).minus(balance).abs().toString(), '10');
    });
  });

  describe('only owner can create a new remittance note', function () {
    it('should be throw error', async function () {
      await expect(
        remittance.createRemittanceNote('1234', '456', { from: bob, value: 10 })
      ).to.eventually.rejectedWith(`${VM_ERROR.revert}only owner can create remittance note`)
    });
  });

  describe('can not use the same password ', function () {
    beforeEach('create a new remittance note first ', async function () {
      await remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 });
    });

    it('should be throw error', async function () {
      await expect(
        remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 })
      ).to.eventually.rejectedWith(`${VM_ERROR.revert}Remittance Exist`)
    });

    it('should be throw error even remittance has exchangeed', async function (){
      await remittance.exchangeRemittance('1234', '456', { from: bob });

      await expect(
        remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 })
      ).to.eventually.rejectedWith(`${VM_ERROR.revert}Remittance Exist`)
    })
  });

  describe('can not exchange remittance when given wrong password', function () {
    beforeEach('create a new remittance note first ', async function () {
      await remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 });
    });

    it('should be throw error', async function () {
      await expect(
        remittance.exchangeRemittance('777', '666', { from: bob })
      ).to.eventually.rejectedWith(`${VM_ERROR.revert}Remittance Exchanged`)
    })
  });
});