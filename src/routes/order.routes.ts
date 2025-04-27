import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = Router();
const orderController = new OrderController();
const dashboardController = new DashboardController();


router.get('/orders', authMiddleware, orderController.getAllOrders);
router.get('/orders/:id', authMiddleware, orderController.getOrderById);
router.patch('/orders/:id/status', authMiddleware, orderController.updateOrderStatus);
router.get('/orders/statistics', authMiddleware, orderController.getOrderStatistics);
router.get('/orders/revenue-overview', authMiddleware, orderController.getRevenueOverview);

// router.get('/dashboard/overview', authMiddleware, dashboardController.getDashboardOverview);

export default router;



/////////////////////////

import { Router } from 'express';
import { OrderController } from '../controller/OrderController';
import { authenticate } from '../middleware/AuthMiddleware';

const router = Router();
const orderController = new OrderController();

router.post('/', authenticate, orderController.createOrder);
router.get('/', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getOrderDetails);
router.get('/:id/invoice', authenticate, orderController.downloadInvoice);

export default router;