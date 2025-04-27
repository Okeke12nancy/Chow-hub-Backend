import { Router } from 'express';
import { WalletController } from '../controller/WalletController';
import { authenticate } from '../middleware/AuthMiddleware';

const router = Router();
const walletController = new WalletController();

router.get('/balance', authenticate, walletController.getWalletBalance);
router.post('/add-funds', authenticate, walletController.addFunds);
router.get('/transactions', authenticate, walletController.getTransactionHistory);

export default router;
