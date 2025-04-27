import { Between } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Order, OrderStatus, PaymentMethod, PaymentStatus } from '../entities/Order';
import { OrderItem } from '../entities/Order-Item';
import { Restaurant } from '../entities/Restaurant';
import { MenuItem } from '../entities/menu-item';
import { User } from '../entities/User';
import { Wallet } from '../entities/Wallet';
import { WalletTransaction, TransactionType } from '../entities/Wallet-Transaction';
import { Voucher } from '../entities/Voucher';

import { 
  getLast30DaysRange, 
  getLast7DaysRange, 
  getCurrentMonthRange, 
  getPreviousMonthRange 
} from '../utils/date.utils';

export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private userRepository = AppDataSource.getRepository(User);
  private restaurantRepository = AppDataSource.getRepository(Restaurant);
  private menuItemRepository = AppDataSource.getRepository(MenuItem);
  private walletRepository = AppDataSource.getRepository(Wallet);
  private walletTransactionRepository = AppDataSource.getRepository(WalletTransaction);
  private voucherRepository = AppDataSource.getRepository(Voucher);

  // Customer order creation
  async createOrder({
    userId,
    restaurantId,
    items,
    paymentMethod,
    voucherCode,
    notes
  }: {
    userId: string;
    restaurantId: string;
    items: Array<{ menuItemId: string; quantity: number }>;
    paymentMethod: PaymentMethod;
    voucherCode?: string | null;
    notes?: string | null;
  }): Promise<{ order: Order; orderItems: OrderItem[] } | { error: string }> {
    // Start a transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Get user with wallet
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        relations: ['wallet']
      });
      
      if (!user) {
        return { error: 'User not found' };
      }
      
      // Get restaurant
      const restaurant = await queryRunner.manager.findOne(Restaurant, {
        where: { id: restaurantId }
      });
      
      if (!restaurant) {
        return { error: 'Restaurant not found' };
      }
      
      // Verify menu items and calculate subtotal
      let subtotal = 0;
      const orderItems: OrderItem[] = [];
      const menuItemIds = items.map(item => item.menuItemId);
      
      const menuItems = await queryRunner.manager.findByIds(MenuItem, menuItemIds);
      
      if (menuItems.length !== menuItemIds.length) {
        return { error: 'One or more menu items not found' };
      }
      
      // Create order
      const order = queryRunner.manager.create(Order, {
        orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        user,
        restaurant,
        paymentMethod,
        voucherCode,
        notes,
        subtotal: 0,  // Will update after calculating items
        discount: 0,  // Will update after applying voucher
        total: 0,     // Will update after calculations
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING
      });
      
      await queryRunner.manager.save(order);
      
      // Create order items
      for (const item of items) {
        const { menuItemId, quantity } = item;
        const menuItem = menuItems.find(mi => mi.id === menuItemId);
        
        if (!menuItem) {
          throw new Error(`Menu item with ID ${menuItemId} not found`);
        }
        
        const itemSubtotal = menuItem.price * quantity;
        subtotal += itemSubtotal;
        
        const orderItem = queryRunner.manager.create(OrderItem, {
          order,
          menuItem,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
          subtotal: itemSubtotal
        });
        
        orderItems.push(orderItem);
        await queryRunner.manager.save(orderItem);
      }
      
      // Update order with subtotal
      order.subtotal = subtotal;
      order.total = subtotal;
      
      // Apply voucher if provided
      if (voucherCode) {
        const voucher = await queryRunner.manager.findOne(Voucher, {
          where: { code: voucherCode, isUsed: false }
        });
        
        if (!voucher) {
          return { error: 'Invalid or used voucher code' };
        }
        
        // Check if voucher has expired
        if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
          return { error: 'Voucher has expired' };
        }
        
        // Check minimum order amount if set
        if (voucher.minOrderAmount && subtotal < voucher.minOrderAmount) {
          return { error: `Minimum order amount not met. Required: ₦${voucher.minOrderAmount}` };
        }
        
        // Calculate discount
        let discount = 0;
        
        if (voucher.isPercentage) {
          discount = (voucher.value / 100) * subtotal;
          
          // Apply max discount limit if set
          if (voucher.maxDiscount && discount > voucher.maxDiscount) {
            discount = voucher.maxDiscount;
          }
        } else {
          discount = voucher.value;
        }
        
        // Update order with discount
        order.discount = discount;
        order.total = subtotal - discount;
        
        // Mark voucher as used
        voucher.isUsed = true;
        voucher.usedBy = user.id;
        voucher.usedAt = new Date();
        
        await queryRunner.manager.save(voucher);
      }
      
      // Process payment
      if (paymentMethod === PaymentMethod.WALLET) {
        // Check wallet balance
        if (user.wallet.balance < order.total) {
          return { 
            error: 'Insufficient wallet balance',
          };
        }
        
        // Deduct from wallet
        user.wallet.balance -= order.total;
        await queryRunner.manager.save(user.wallet);
        
        // Record transaction
        const walletTransaction = queryRunner.manager.create(WalletTransaction, {
          wallet: user.wallet,
          amount: order.total,
          type: TransactionType.PAYMENT,
          referenceId: order.id,
          description: `Payment for order #${order.orderNumber}`,
          balanceAfter: user.wallet.balance
        });
        
        await queryRunner.manager.save(walletTransaction);
        
        // Update order payment status
        order.paymentStatus = PaymentStatus.PAID;
        order.status = OrderStatus.COMPLETED;
      } else if (paymentMethod === PaymentMethod.VOUCHER) {
        if (!voucherCode) {
          return { error: 'Voucher code is required for voucher payment' };
        }
        
        order.paymentStatus = PaymentStatus.PAID;
        order.status = OrderStatus.COMPLETED;
      }
      
      await queryRunner.manager.save(order);
      
      await queryRunner.commitTransaction();
      
      return { order, orderItems };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      console.error('Create order error:', error);
      return { error: 'An error occurred while creating the order' };
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  // Get orders for a customer
  async getUserOrders(
    userId: string,
    status?: string,
    search?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;
    
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .where('order.user.id = :userId', { userId });
    
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :search OR restaurant.name LIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    const total = await queryBuilder.getCount();
    
    const orders = await queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();
    
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      restaurant: {
        id: order.restaurant.id,
        name: order.restaurant.name
      },
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      itemCount: order.orderItems.length,
      items: order.orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))
    }));
    
    return {
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get orders for a vendor
  async getAllOrders(
    vendorId: string,
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
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.menuItem', 'menuItem')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.restaurant.ownerId = :vendorId', { vendorId });
    
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :search OR user.fullName LIKE :search OR user.email LIKE :search)',
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
    
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: {
        name: order.user.firstName + ' ' + order.user.lastName,
        email: order.user.email,
        phone: order.user.phone
      },
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      itemCount: order.orderItems.length,
      items: order.orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))
    }));
    
    return {
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getOrderById(id: string, userId: string, userType: 'customer' | 'vendor') {
    const whereCondition = userType === 'customer' 
      ? { id, user: { id: userId } }
      : { id, restaurant: { id: userId } };
    
    return this.orderRepository.findOne({
      where: whereCondition as any,
      relations: ['restaurant', 'orderItems', 'user']
    });
  }

  async updateOrderStatus(id: string, vendorId: string, status: OrderStatus) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['restaurant']
    });
    
    if (!order) {
      return null;
    }
    
    order.status = status;
    
    if (status === OrderStatus.COMPLETED && order.paymentStatus === PaymentStatus.PENDING) {
      order.paymentStatus = PaymentStatus.PAID;
    }
    
    return this.orderRepository.save(order);
  }

  async getOrderStatistics(vendorId: string) {
    const { start: startOfMonth, end: endOfMonth } = getCurrentMonthRange();
    const { start: startOfPrevMonth, end: endOfPrevMonth } = getPreviousMonthRange();
    
    const totalOrdersCurrentMonth = await this.orderRepository.count({
      where: {
        restaurant: { ownerId: vendorId },
        createdAt: Between(startOfMonth, endOfMonth)
      }
    });
    
    const totalOrdersPrevMonth = await this.orderRepository.count({
      where: {
        restaurant: { ownerId: vendorId },
        createdAt: Between(startOfPrevMonth, endOfPrevMonth)
      }
    });
    
    const orderPercentChange = totalOrdersPrevMonth > 0
      ? ((totalOrdersCurrentMonth - totalOrdersPrevMonth) / totalOrdersPrevMonth) * 100
      : 0;
    
    const totalRevenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.restaurant.ownerId = :vendorId', { vendorId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const totalRevenueCurrentMonth = totalRevenueResult.total || 0;
    
    // Get total revenue for previous month
    const prevRevenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.restaurant.ownerId = :vendorId', { vendorId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfPrevMonth,
        end: endOfPrevMonth
      })
      .getRawOne();
    
    const totalRevenuePrevMonth = prevRevenueResult.total || 0;
    
    const revenuePercentChange = totalRevenuePrevMonth > 0
      ? ((totalRevenueCurrentMonth - totalRevenuePrevMonth) / totalRevenuePrevMonth) * 100
      : 0;
    
    const newCustomersResult = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.user', 'user')
      .select('COUNT(DISTINCT user.id)', 'count')
      .where('order.restaurant.ownerId = :vendorId', { vendorId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth
      })
      .getRawOne();
    
    const newCustomersCurrentMonth = newCustomersResult.count || 0;
    
    const prevCustomersResult = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.user', 'user')
      .select('COUNT(DISTINCT user.id)', 'count')
      .where('order.restaurant.ownerId = :vendorId', { vendorId })
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

  async getRevenueOverview(vendorId: string) {
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
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const result = await this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.restaurant.ownerId = :vendorId', { vendorId })
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