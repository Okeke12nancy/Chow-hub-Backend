import { Router } from 'express';
import { VoucherController } from '../controller/VoucherController';
import { authenticate } from '../middleware/AuthMiddleware';

const router = Router();
const voucherController = new VoucherController();

router.post('/validate', authenticate, voucherController.validateVoucher);

export default router;