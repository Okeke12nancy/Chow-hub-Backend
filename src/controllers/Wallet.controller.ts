import { Request, Response } from 'express';
import { getRepository, getConnection } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entity/User';
import { Wallet } from '../entity/Wallet';
import { WalletTransaction, TransactionType } from '../entity/WalletTransaction';

export class WalletController {
  async getWalletBalance(req: Request, res: Response): Promise<Response> {
    try {
      const walletRepository = getRepository(Wallet);
      
      const wallet = await walletRepository.findOne({
        where: { user: { id: req.user!.id } }
      });
      
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      return res.status(200).json({ balance: wallet.balance });
    } catch (error) {
      console.error('Get wallet balance error:', error);
      return res.status(500).json({ error: 'An error occurred while fetching wallet balance' });
    }
  }

  async addFunds(req: Request, res: Response): Promise<Response> {
    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }
      
      const walletRepository = queryRunner.manager.getRepository(Wallet);
      
      const wallet = await walletRepository.findOne({
        where: { user: { id: req.user!.id } }
      });
      
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      // Add funds to wallet
      wallet.balance += amount;
      await queryRunner.manager.save(wallet);
      
      // Record transaction
      const transaction = new WalletTransaction();
      transaction.wallet = wallet;
      transaction.amount = amount;
      transaction.type = TransactionType.DEPOSIT;
      transaction.referenceId = uuidv4();
      transaction.description = 'Wallet top-up';
      transaction.balanceAfter = wallet.balance;
      
      await queryRunner.manager.save(transaction);
      
      // Commit transaction
      await queryRunner.commitTransaction();
      
      return res.status(200).json({
        message: 'Funds added successfully',
        transaction: {
          id: transaction.id,
          amount,
          type: transaction.type,
          balanceAfter: transaction.balanceAfter,
          createdAt: transaction.createdAt
        },
        balance: wallet.balance
      });
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      console.error('Add funds error:', error);
      return res.status(500).json({ error: 'An error occurred while adding funds' });
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async getTransactionHistory(req: Request, res: Response): Promise<Response> {
    try {
      const walletRepository = getRepository(Wallet);
      const transactionRepository = getRepository(WalletTransaction);
      
      const wallet = await walletRepository.findOne({
        where: { user: { id: req.user!.id } }
      });
      
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      const transactions = await transactionRepository.find({
        where: { wallet: { id: wallet.id } },
        order: { createdAt: 'DESC' }
      });
      
      return res.status(200).json({
        balance: wallet.balance,
        transactions: transactions.map(transaction => ({
          id: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description,
          balanceAfter: transaction.balanceAfter,
          createdAt: transaction.createdAt
        }))
      });
    } catch (error) {
      console.error('Get transaction history error:', error);
      return res.status(500).json({ error: 'An error occurred while fetching transaction history' });
    }
  }
}