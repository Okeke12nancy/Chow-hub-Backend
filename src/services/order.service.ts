import { Between } from 'typeorm';
import { Order, OrderStatus } from '../entities/Order';
import { Product } from '../entities/Product';
import { Transaction } from '../entities/transaction.entity';
import { PaymentStatus } from '../entities/Payment';
import { 
  getLast30DaysRange, 
  getLast7DaysRange, 
  getCurrentMonthRange, 
  getPreviousMonthRange 
} from '../utils/date.utils';
import { AppDataSource } from '../data-source';

export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private productRepository = AppDataSource.getRepository(Product);
  private transactionRepository = AppDataSource.getRepository(Transaction);

  async getAllOrders(
    userId: string,
    status?: string,
    search?: string,
    period?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;
    
    // Build query
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('order.vendorId = :userId', { userId });
    
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :search OR order.customerName LIKE :search OR order.customerEmail LIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    if (period === '7days') {
      const { start, end } = getLast7DaysRange();
      queryBuilder.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    } else if (period === '30days') {
      const { start, end } = getLast30DaysRange();
      queryBuilder.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    }
    
    const total = await queryBuilder.getCount();
    
    const orders = await queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();
    
    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getOrderById(id: string, userId: string) {
    return this.orderRepository.findOne({
      where: { id, vendorId: userId },
      relations: ['items', 'items.product', 'payment']
    });
  }

  async updateOrderStatus(id: string, userId: string, status: OrderStatus) {
    const order = await this.orderRepository.findOne({
      where: { id, vendorId: userId }
    });
    
    if (!order) {
      return null;
    }
    
    order.status = status;
    return this.orderRepository.save(order);
  }

  async getOrderStatistics(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const totalOrdersCurrentMonth = await this.orderRepository.count({
      where: {
        vendorId: userId,
        createdAt: Between(startOfMonth, endOfMonth)
      }
    });
    
    const totalOrdersPrevMonth = await this.orderRepository.count({
      where: {
        vendorId: userId,
        createdAt: Between(startOfPrevMonth, endOfPrevMonth)
      }
    });
    
    const orderPercentChange = totalOrdersPrevMonth > 0
      ? ((totalOrdersCurrentMonth - totalOrdersPrevMonth) / totalOrdersPrevMonth) * 100
      : 0;
    
    const totalRevenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.vendorId = :userId', { userId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const totalRevenueCurrentMonth = totalRevenueResult.total || 0;
    
    const prevRevenueResult = await this.orderRepository
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
    const newCustomersResult = await this.orderRepository
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
    const prevCustomersResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerEmail)', 'count')
      .where('order.vendorId = :userId', { userId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfPrevMonth,
        end: endOfPrevMonth
      })
      .getRawOne();
    
    const newCustomersPrevMonth = prevCustomersResult.count || 0;
    
    const customerPercentChange = newCustomersPrevMonth > 0
      ? ((newCustomersCurrentMonth - newCustomersPrevMonth) / newCustomersPrevMonth) * 100
      : 0;

    return {
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
    };
  }

  async getRevenueOverview(userId: string) {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    
    const monthlyRevenue = [];
    
    for (let i = 0; i < 6; i++) {
      const month = new Date(sixMonthsAgo);
      month.setMonth(month.getMonth() + i);
      
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const result = await this.orderRepository
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
    
    return monthlyRevenue;
  }
}