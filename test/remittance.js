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
  let puzzle;
  let passwordA = web3.fromUtf8("123");
  let passwordB = web3.fromUtf8("456");

  beforeEach('Deploy new contract instance and get new puzzle back', async function () {
    remittance = await Remittance.new({ from: alice });
    puzzle = await remittance.getPuzzle(passwordA, passwordB);
  });

  describe('remittance state', function () {
    it('should be exist', async function () {
      await remittance.createRemittanceNote(puzzle, { from: alice, value: 10 });

      let isNotExist = await remittance.isNotExist(puzzle);
      assert.equal(isNotExist, false);
    });

    it('should be withdraw', async function () {
      await remittance.createRemittanceNote(puzzle, { from: alice, value: 10 });
      await remittance.withdraw(passwordA, passwordB, { from: bob });

      let isNotExchanged = await remittance.isNotExchanged(puzzle);
      assert.equal(isNotExchanged, false);
    });
  });

  describe('.createRemittanceNote(): everyone can create a new remittance note', function () {
    it('simulate create a new remittance note', async function () {
      let simulate = await remittance.createRemittanceNote.call(puzzle, { from: alice, value: 10});
      assert.equal(simulate, true);
    });

    it('create a new remittance note', async function () {
      let balance = await web3.eth.getBalancePromise(alice);
      let transaction = await remittance.createRemittanceNote(puzzle, { from: alice, value: 10 });
      let transactionFee = await calculateTransactionFee(transaction);
      let balanceFinal = await web3.eth.getBalancePromise(alice);

      assert.equal(balanceFinal.plus(transactionFee).minus(balance).abs().toString(), '10');
    });

    it('should receive LogCreateRemittanceNote event log', async function () {
      let transaction = await remittance.createRemittanceNote(puzzle, { from: alice, value: 10 });
      let { event, args } = transaction.logs[0];
      assert.equal(event, 'LogCreateRemittanceNote');
      assert.equal(args.puzzle, puzzle);
      assert.equal(args.amount.toString(), '10');
    })
  });

  describe('.withdraw(): someone who knows the password can take the money', function () {
    beforeEach('create a new remittance note first ', async function () {
      await remittance.createRemittanceNote(puzzle, { from: alice, value: 10 });
    });

    it('simulate exchange the remittance', async function () {
      let simulate = await remittance.withdraw.call(passwordA, passwordB);
      assert.equal(simulate, true);
    });

    it('should take money back', async function () {
      let balance = await web3.eth.getBalancePromise(bob);
      let transaction = await remittance.withdraw(passwordA, passwordB, { from: bob });
      let transactionFee = await calculateTransactionFee(transaction);
      let balanceFinal = await web3.eth.getBalancePromise(bob);

      assert.equal(balanceFinal.plus(transactionFee).minus(balance).abs().toString(), '10');
    });

    it('should receive LogWithdraw event log', async function () {
      let transaction = await remittance.withdraw(passwordA, passwordB, { from: bob });
      let { event, args } = transaction.logs[0];
      assert.equal(event, 'LogWithdraw');
      assert.equal(args.puzzle, puzzle);
      assert.equal(args.exchanger, bob);
    })
  })

  // describe('only owner can create a new remittance note', function () {
  //   it('should be throw error', async function () {
  //     await expect(
  //       remittance.createRemittanceNote('1234', '456', { from: bob, value: 10 })
  //     ).to.eventually.rejectedWith(`${VM_ERROR.revert}only owner can create remittance note`)
  //   });
  // });

  // describe('can not use the same password ', function () {
  //   beforeEach('create a new remittance note first ', async function () {
  //     await remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 });
  //   });

  //   it('should be throw error', async function () {
  //     await expect(
  //       remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 })
  //     ).to.eventually.rejectedWith(`${VM_ERROR.revert}Remittance Exist`)
  //   });

  //   it('should be throw error even remittance has exchangeed', async function (){
  //     await remittance.exchangeRemittance('1234', '456', { from: bob });

  //     await expect(
  //       remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 })
  //     ).to.eventually.rejectedWith(`${VM_ERROR.revert}Remittance Exist`)
  //   })
  // });

  // describe('can not exchange remittance when given wrong password', function () {
  //   beforeEach('create a new remittance note first ', async function () {
  //     await remittance.createRemittanceNote('1234', '456', { from: alice, value: 10 });
  //   });

  //   it('should be throw error', async function () {
  //     await expect(
  //       remittance.exchangeRemittance('777', '666', { from: bob })
  //     ).to.eventually.rejectedWith(`${VM_ERROR.revert}Remittance Exchanged`)
  //   })
  // });
});