import { Request, Response } from 'express';
import { getRepository, Between, Like } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/orderItem.entity';
import { Product } from '../entities/product.entity';
import { getLast30DaysRange, getLast7DaysRange } from '../utils/date.utils';

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user;
    const { status, search, period } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const orderRepository = getRepository(Order);
    
    // Build query
    const queryBuilder = orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('order.vendorId = :userId', { userId });
    
    // Add filters
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :search OR order.customerName LIKE :search OR order.customerEmail LIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Date range filter
    if (period === '7days') {
      const { start, end } = getLast7DaysRange();
      queryBuilder.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    } else if (period === '30days') {
      const { start, end } = getLast30DaysRange();
      queryBuilder.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    }
    
    // Get total count
    const total = await queryBuilder.getCount();
    
    // Get paginated results
    const orders = await queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();
    
    res.status(200).json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    
    const orderRepository = getRepository(Order);
    const order = await orderRepository.findOne({
      where: { id, vendorId: userId },
      relations: ['items', 'items.product', 'payment']
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId } = req.user;
    
    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }
    
    const orderRepository = getRepository(Order);
    const order = await orderRepository.findOne({
      where: { id, vendorId: userId }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.status = status;
    await orderRepository.save(order);
    
    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

export const getOrderStatistics = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user;
    
    const orderRepository = getRepository(Order);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get previous month range
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get total orders count (current month)
    const totalOrdersCurrentMonth = await orderRepository.count({
      where: {
        vendorId: userId,
        createdAt: Between(startOfMonth, endOfMonth)
      }
    });
    
    // Get total orders count (previous month)
    const totalOrdersPrevMonth = await orderRepository.count({
      where: {
        vendorId: userId,
        createdAt: Between(startOfPrevMonth, endOfPrevMonth)
      }
    });
    
    // Calculate percentage change
    const orderPercentChange = totalOrdersPrevMonth > 0
      ? ((totalOrdersCurrentMonth - totalOrdersPrevMonth) / totalOrdersPrevMonth) * 100
      : 0;
    
    // Get total revenue (current month)
    const totalRevenueResult = await orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.vendorId = :userId', { userId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const totalRevenueCurrentMonth = totalRevenueResult.total || 0;
    
    // Get total revenue (previous month)
    const prevRevenueResult = await orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.vendorId = :userId', { userId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfPrevMonth,
        end: endOfPrevMonth
      })
      .getRawOne();
    
    const totalRevenuePrevMonth = prevRevenueResult.total || 0;
    
    // Calculate percentage change
    const revenuePercentChange = totalRevenuePrevMonth > 0
      ? ((totalRevenueCurrentMonth - totalRevenuePrevMonth) / totalRevenuePrevMonth) * 100
      : 0;
    
    // Get new customers count (unique customer emails this month)
    const newCustomersResult = await orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerEmail)', 'count')
      .where('order.vendorId = :userId', { userId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const newCustomersCurrentMonth = newCustomersResult.count || 0;
    
    // Get new customers count (previous month)
    const prevCustomersResult = await orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerEmail)', 'count')
      .where('order.vendorId = :userId', { userId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfPrevMonth,
        end: endOfPrevMonth
      })
      .getRawOne();
    
    const newCustomersPrevMonth = prevCustomersResult.count || 0;
    
    // Calculate percentage change
    const customerPercentChange = newCustomersPrevMonth > 0
      ? ((newCustomersCurrentMonth - newCustomersPrevMonth) / newCustomersPrevMonth) * 100
      : 0;
    
    res.status(200).json({
      totalOrders: {
        count: totalOrdersCurrentMonth,
        percentChange: orderPercentChange
      },
      totalRevenue: {
        amount: totalRevenueCurrentMonth,
        percentChange: revenuePercentChange
      },
      newCustomers: {
        count: newCustomersCurrentMonth,
        percentChange: customerPercentChange
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch order statistics',
      error: error.message
    });
  }
};

export const getRevenueOverview = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user;
    
    const orderRepository = getRepository(Order);
    
    // Get data for last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    
    // Set to start of month
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    
    // Get monthly revenue
    const monthlyRevenue = [];
    
    for (let i = 0; i < 6; i++) {
      const month = new Date(sixMonthsAgo);
      month.setMonth(month.getMonth() + i);
      
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const result = await orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.vendorId = :userId', { userId })
        .andWhere('order.createdAt BETWEEN :start AND :end', {
          start: startOfMonth,
          end: endOfMonth
        })
        .getRawOne();
      
      const monthName = month.toLocaleString('default', { month: 'short' });
      
      monthlyRevenue.push({
        month: monthName,
        revenue: parseFloat(result.total) || 0
      });
    }
    
    res.status(200).json(monthlyRevenue);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch revenue overview',
      error: error.message
    });
  }
};
