// src/services/payment.service.ts
import { AppDataSource } from '../data-source';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/Payment';
import { Transaction } from '../entities/transaction.entity';
import { 
  getCurrentMonthRange, 
  getLast30DaysRange, 
  getLast7DaysRange, 
  getPreviousMonthRange 
} from '../utils/date.utils';

export class PaymentService {
  private paymentRepository = AppDataSource.getRepository(Payment);
  private transactionRepository = AppDataSource.getRepository(Transaction);

  async getAllPayments(
    userId: string, 
    options: { status?: string; period?: string; page: number; limit: number }
  ) {
    const { status, period, page, limit } = options;
    const skip = (page - 1) * limit;
    
    // Build query
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .where('order.vendorId = :userId', { userId });
    
    // Add filters
    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }
    
    // Date range filter
    if (period === '7days') {
      const { start, end } = getLast7DaysRange();
      queryBuilder.andWhere('payment.createdAt BETWEEN :start AND :end', { start, end });
    } else if (period === '30days') {
      const { start, end } = getLast30DaysRange();
      queryBuilder.andWhere('payment.createdAt BETWEEN :start AND :end', { start, end });
    }
    
    // Get total count
    const total = await queryBuilder.getCount();
    
    // Get paginated results
    const payments = await queryBuilder
      .orderBy('payment.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();
    
    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getPaymentStatistics(userId: string) {
    // Get current month and previous month ranges
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
    
    // Calculate percentage change
    const revenuePercentChange = totalRevenuePrevMonth > 0
      ? ((totalRevenueCurrentMonth - totalRevenuePrevMonth) / totalRevenuePrevMonth) * 100
      : 0;
    
    // Get pending payments (current month)
    const pendingPaymentsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.vendorId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const pendingPaymentsCurrentMonth = parseFloat(pendingPaymentsResult.total) || 0;
    
    // Get pending payments (previous month)
    const prevPendingResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.vendorId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfPrevMonth,
        end: endOfPrevMonth
      })
      .getRawOne();
    
    const pendingPaymentsPrevMonth = parseFloat(prevPendingResult.total) || 0;
    
    // Calculate percentage change
    const pendingPercentChange = pendingPaymentsPrevMonth > 0
      ? ((pendingPaymentsCurrentMonth - pendingPaymentsPrevMonth) / pendingPaymentsPrevMonth) * 100
      : 0;
    
    // Get average order value (current month)
    const avgOrderValueResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('AVG(transaction.amount)', 'average')
      .where('transaction.vendorId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const avgOrderValueCurrentMonth = parseFloat(avgOrderValueResult.average) || 0;
    
    // Get average order value (previous month)
    const prevAvgOrderResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('AVG(transaction.amount)', 'average')
      .where('transaction.vendorId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfPrevMonth,
        end: endOfPrevMonth
      })
      .getRawOne();
    
    const avgOrderValuePrevMonth = parseFloat(prevAvgOrderResult.average) || 0;
    
    // Calculate percentage change
    const avgOrderPercentChange = avgOrderValuePrevMonth > 0
      ? ((avgOrderValueCurrentMonth - avgOrderValuePrevMonth) / avgOrderValuePrevMonth) * 100
      : 0;
    
    // Get refunds (current month)
    const refundsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.vendorId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: PaymentStatus.FAILED })
      .andWhere('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const refundsCurrentMonth = parseFloat(refundsResult.total) || 0;
    
    // Get refunds (previous month)
    const prevRefundsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.vendorId = :userId', { userId })
      .andWhere('transaction.status = :status', { status: PaymentStatus.FAILED })
      .andWhere('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfPrevMonth,
        end: endOfPrevMonth
      })
      .getRawOne();
    
    const refundsPrevMonth = parseFloat(prevRefundsResult.total) || 0;
    
    // Calculate percentage change
    const refundsPercentChange = refundsPrevMonth > 0
      ? ((refundsCurrentMonth - refundsPrevMonth) / refundsPrevMonth) * 100
      : 0;
    
    return {
      totalRevenue: {
        amount: totalRevenueCurrentMonth,
        percentChange: revenuePercentChange
      },
      pendingPayments: {
        amount: pendingPaymentsCurrentMonth,
        percentChange: pendingPercentChange
      },
      averageOrderValue: {
        amount: avgOrderValueCurrentMonth,
        percentChange: avgOrderPercentChange
      },
      refunds: {
        amount: refundsCurrentMonth,
        percentChange: refundsPercentChange
      }
    };
  }

  async getPaymentMethodsDistribution(userId: string) {
    const { startOfMonth, endOfMonth } = getCurrentMonthRange();
    
    const paymentMethods = Object.values(PaymentMethod);
    const distribution = [];
    
    for (const method of paymentMethods) {
      const result = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .addSelect('COUNT(transaction.id)', 'count')
        .where('transaction.vendorId = :userId', { userId })
        .andWhere('transaction.paymentMethod = :method', { method })
        .andWhere('transaction.createdAt BETWEEN :start AND :end', {
          start: startOfMonth,
          end: endOfMonth
        })
        .getRawOne();
      
      distribution.push({
        method,
        total: parseFloat(result.total) || 0,
        count: parseInt(result.count) || 0
      });
    }
    
    return distribution;
  }

  async getRevenueByMonth(userId: string) {
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
      
      const result = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.vendorId = :userId', { userId })
        .andWhere('transaction.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('transaction.createdAt BETWEEN :start AND :end', {
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