import { Router } from 'express';
import { RestaurantController } from '../controller/RestaurantController';

const router = Router();
const restaurantController = new RestaurantController();

router.get('/', restaurantController.getAllRestaurants);
router.get('/:id', restaurantController.getRestaurantById);

export default router;