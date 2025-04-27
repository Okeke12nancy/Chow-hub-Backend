import { Router } from 'express';
import { MenuController } from '../controller/MenuController';

const router = Router();
const menuController = new MenuController();

router.get('/restaurant/:restaurantId', menuController.getRestaurantMenu);

export default router;