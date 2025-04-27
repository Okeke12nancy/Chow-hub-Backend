import { Request, Response } from 'express';
import { Restaurant } from '../entities/Restaurant';
import { MenuItem } from '../entities/menu-item';
import { AppDataSource } from '../data-source';

export class MenuController {
  async getRestaurantMenu(req: Request, res: Response): Promise<Response> {
    try {
      const { restaurantId } = req.params;
      
      const restaurantRepository = AppDataSource.getRepository(Restaurant);
      const restaurant = await restaurantRepository.findOne({
        where: { id: restaurantId }
      });
      
      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }
      
      const menuItemRepository = AppDataSource.getRepository(MenuItem);
      const menuItems = await menuItemRepository.find({
        where: { restaurant: { id: restaurantId }, isAvailable: true },
        order: { category1: 'ASC', name: 'ASC' }
      });
      
      // Group by category
      const menuByCategory: Record<string, MenuItem[]> = {};
      
      menuItems.forEach(item => {
        if (!menuByCategory[item.category1]) {
          menuByCategory[item.category1] = [];
        }
        menuByCategory[item.category1].push(item);
      });
      
      return res.status(200).json({
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          rating: restaurant.rating,
          estimatedDeliveryTime: restaurant.estimatedDeliveryTime
        },
        menu: menuByCategory
      });
    } catch (error) {
      console.error('Get menu error:', error);
      return res.status(500).json({ error: 'An error occurred while fetching menu' });
    }
  }
}
