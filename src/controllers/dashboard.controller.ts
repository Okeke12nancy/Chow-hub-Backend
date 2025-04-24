import { Request, Response } from 'express';
import { getRepository, Between } from 'typeorm';
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Order, OrderStatus } from '../entities/Order';
import { Transaction } from '../entities/transaction.entity';
import { PaymentStatus } from '../entities/Payment';
import { getCurrentMonthRange, getPreviousMonthRange } from '../utils/date.utils';

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user;
    
    const { startOfMonth, endOfMonth } = getCurrentMonthRange();
    const { startOfPrevMonth, endOfPrevMonth } = getPreviousMonthRange();
    
    const orderRepository = getRepository(Order);
    const productRepository = getRepository(Product);
    const transactionRepository = getRepository(Transaction);
    
    const totalRevenueResult = await transactionRepository
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
    const prevRevenueResult = await transactionRepository
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
    
    const totalOrdersCurrentMonth = await orderRepository.count({
      where: {
        vendorId: userId,
        createdAt: Between(startOfMonth, endOfMonth)
      }
    });
    
    const totalOrdersPrevMonth = await orderRepository.count({
      where: {
        vendorId: userId,
        createdAt: Between(startOfPrevMonth, endOfPrevMonth)
      }
    });
    
    const orderPercentChange = totalOrdersPrevMonth > 0
      ? ((totalOrdersCurrentMonth - totalOrdersPrevMonth) / totalOrdersPrevMonth) * 100
      : 0;
    
    const newCustomersResult = await orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerEmail)', 'count')
      .where('order.vendorId = :userId', { userId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const newCustomersCurrentMonth = parseInt(newCustomersResult.count) || 0;
    
    const prevCustomersResult = await orderRepository
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
    
    const totalProducts = await productRepository.count({
      where: { userId, isActive: true }
    });
    
    const totalProductsPrevMonth = await productRepository.count({
      where: {
        userId,
        isActive: true,
        createdAt: Between(startOfPrevMonth, endOfPrevMonth)
      }
    });
    
    const productPercentChange = totalProductsPrevMonth > 0
      ? ((totalProducts - totalProductsPrevMonth) / totalProductsPrevMonth) * 100
      : 0;
    
    const recentOrders = await orderRepository.find({
      where: { vendorId: userId },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['products']
    });
    
    const topSellingProducts = await orderRepository
      .createQueryBuilder('order')
      .select('order.productId', 'productId')
      .addSelect('SUM(order.quantity)', 'totalQuantity')
      .where('order.vendorId = :userId', { userId })
      .groupBy('order.productId')
      .orderBy('totalQuantity', 'DESC')
      .limit(5)
      .getRawMany();
    
    res.json({
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
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: error.message
    });
  }
};
