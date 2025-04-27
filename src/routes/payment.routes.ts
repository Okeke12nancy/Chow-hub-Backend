import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import {authMiddleware} from '../middlewares/authMiddleware';

const router = Router();
const paymentController = new PaymentController();

router.get('/', authMiddleware, (req, res) => paymentController.getAllPayments(req, res));
router.get('/statistics', authMiddleware, (req, res) => paymentController.getPaymentStatistics(req, res));
router.get('/methods-distribution', authMiddleware, (req, res) => paymentController.getPaymentMethodsDistribution(req, res));
router.get('/revenue-by-month', authMiddleware, (req, res) => paymentController.getRevenueByMonth(req, res));

export default router;