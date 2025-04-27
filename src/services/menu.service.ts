import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Restaurant } from '../entity/Restaurant';
import { MenuItem } from '../entity/MenuItem';

export class MenuController {
  async getRestaurantMenu(req: Request, res: Response): Promise<Response> {
    try {
      const { restaurantId } = req.params;
      
      const restaurantRepository = getRepository(Restaurant);
      const restaurant = await restaurantRepository.findOne(restaurantId);
      
      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }
      
      const menuItemRepository = getRepository(MenuItem);
      const menuItems = await menuItemRepository.find({
        where: { restaurant: { id: restaurantId }, isAvailable: true },
        order: { category: 'ASC', name: 'ASC' }
      });
      
      // Group by category
      const menuByCategory: Record<string, MenuItem[]> = {};
      
      menuItems.forEach(item => {
        if (!menuByCategory[item.category]) {
          menuByCategory[item.category] = [];
        }
        menuByCategory[item.category].push(item);
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