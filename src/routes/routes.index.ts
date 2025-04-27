import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import productRoutes from './product.routes';
const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orders', orderRoutes);
router.use('/products', productRoutes);

export default router;



////////////////////

import { Router } from 'express';
import userRoutes from './user.routes';
import restaurantRoutes from './restaurant.routes';
import menuRoutes from './menu.routes';
import orderRoutes from './order.routes';
import walletRoutes from './wallet.routes';
import voucherRoutes from './voucher.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/wallet', walletRoutes);
router.use('/vouchers', voucherRoutes);