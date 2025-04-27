import { Between } from 'typeorm';
import { Product } from '../entities/Product';
import { Order } from '../entities/Order';
import { Transaction } from '../entities/transaction.entity';
import { PaymentStatus } from '../entities/Payment';
import { getCurrentMonthRange, getPreviousMonthRange } from '../utils/date.utils';
import { AppDataSource } from '../data-source';

export class DashboardService {
  private orderRepository = AppDataSource.getRepository(Order);
  private productRepository = AppDataSource.getRepository(Product);
  private transactionRepository = AppDataSource.getRepository(Transaction);
  
  async getDashboardOverview(userId: string) {
    const { startOfMonth, endOfMonth } = getCurrentMonthRange();
    const { startOfPrevMonth, endOfPrevMonth } = getPreviousMonthRange();
    
    // Get total revenue (current month)
    const totalRevenueResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.vendorId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const totalRevenueCurrentMonth = parseFloat(totalRevenueResult.total) || 0;
    
    // Get total revenue (previous month)
    const prevRevenueResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.vendorId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfPrevMonth,
        end: endOfPrevMonth
      })
      .getRawOne();
    
    const totalRevenuePrevMonth = parseFloat(prevRevenueResult.total) || 0;
    
    const revenuePercentChange = totalRevenuePrevMonth > 0
      ? ((totalRevenueCurrentMonth - totalRevenuePrevMonth) / totalRevenuePrevMonth) * 100
      : 0;
    
    // Get total orders (current month)
    const totalOrdersCurrentMonth = await this.orderRepository.count({
      where: {
        vendorId: userId,
        createdAt: Between(startOfMonth, endOfMonth)
      }
    });
    
    // Get total orders (previous month)
    const totalOrdersPrevMonth = await this.orderRepository.count({
      where: {
        vendorId: userId,
        createdAt: Between(startOfPrevMonth, endOfPrevMonth)
      }
    });
    
    const orderPercentChange = totalOrdersPrevMonth > 0
      ? ((totalOrdersCurrentMonth - totalOrdersPrevMonth) / totalOrdersPrevMonth) * 100
      : 0;
    
    // Get new customers (current month)
    const newCustomersResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerEmail)', 'count')
      .where('order.vendorId = :userId', { userId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const newCustomersCurrentMonth = parseInt(newCustomersResult.count) || 0;
    
    // Get new customers (previous month)
    const prevCustomersResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerEmail)', 'count')
      .where('order.vendorId = :userId', { userId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfPrevMonth,
        end: endOfPrevMonth
      })
      .getRawOne();
    
    const newCustomersPrevMonth = parseInt(prevCustomersResult.count) || 0;
    
    const customerPercentChange = newCustomersPrevMonth > 0
      ? ((newCustomersCurrentMonth - newCustomersPrevMonth) / newCustomersPrevMonth) * 100
      : 0;
    
    // Get total products
    const totalProducts = await this.productRepository.count({
      where: { userId, isActive: true }
    });
    
    // Get total products (previous month)
    const totalProductsPrevMonth = await this.productRepository.count({
      where: {
        userId,
        isActive: true,
        createdAt: Between(startOfPrevMonth, endOfPrevMonth)
      }
    });
    
    const productPercentChange = totalProductsPrevMonth > 0
      ? ((totalProducts - totalProductsPrevMonth) / totalProductsPrevMonth) * 100
      : 0;
    
    // Get recent orders
    const recentOrders = await this.orderRepository.find({
      where: { vendorId: userId },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['products']
    });
    
    // Get top selling products
    const topSellingProducts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.productId', 'productId')
      .addSelect('SUM(order.quantity)', 'totalQuantity')
      .where('order.vendorId = :userId', { userId })
      .groupBy('order.productId')
      .orderBy('totalQuantity', 'DESC')
      .limit(5)
      .getRawMany();
    
    return {
      totalRevenueCurrentMonth,
      totalRevenuePrevMonth,
      revenuePercentChange,
      totalOrdersCurrentMonth,
      totalOrdersPrevMonth,
      orderPercentChange,
      newCustomersCurrentMonth,
      newCustomersPrevMonth,
      customerPercentChange,
      totalProducts,
      totalProductsPrevMonth,
      productPercentChange,
      recentOrders,
      topSellingProducts
    };
  }
}