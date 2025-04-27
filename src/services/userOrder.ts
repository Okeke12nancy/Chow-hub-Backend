import { Request, Response } from 'express';
import { getRepository, getConnection } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entity/User';
import { Restaurant } from '../entity/Restaurant';
import { MenuItem } from '../entity/MenuItem';
import { Order, OrderStatus, PaymentMethod, PaymentStatus } from '../entity/Order';
import { OrderItem } from '../entity/OrderItem';
import { Wallet } from '../entity/Wallet';
import { WalletTransaction, TransactionType } from '../entity/WalletTransaction';
import { Voucher } from '../entity/Voucher';
import { InvoiceService } from '../service/InvoiceService';

export class OrderController {
  private invoiceService: InvoiceService;

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  async createOrder(req: Request, res: Response): Promise<Response> {
    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const { restaurantId, items, paymentMethod, voucherCode = null, notes = null } = req.body;
      
      if (!restaurantId || !items || !paymentMethod || items.length === 0) {
        return res.status(400).json({ error: 'Restaurant ID, items, and payment method are required' });
      }
      
      // Validate payment method
      if (!Object.values(PaymentMethod).includes(paymentMethod)) {
        return res.status(400).json({ error: 'Invalid payment method' });
      }
      
      const userRepository = queryRunner.manager.getRepository(User);
      const restaurantRepository = queryRunner.manager.getRepository(Restaurant);
      const menuItemRepository = queryRunner.manager.getRepository(MenuItem);
      const orderRepository = queryRunner.manager.getRepository(Order);
      const orderItemRepository = queryRunner.manager.getRepository(OrderItem);
      const walletRepository = queryRunner.manager.getRepository(Wallet);
      const voucherRepository = queryRunner.manager.getRepository(Voucher);
      
      // Get user
      const user = await userRepository.findOne(req.user!.id, { relations: ['wallet'] });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get restaurant
      const restaurant = await restaurantRepository.findOne(restaurantId);
      
      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }
      
      // Verify menu items and calculate subtotal
      let subtotal = 0;
      const orderItems: OrderItem[] = [];
      const menuItemIds = items.map((item: { menuItemId: string }) => item.menuItemId);
      
      const menuItems = await menuItemRepository.findByIds(menuItemIds);
      
      if (menuItems.length !== menuItemIds.length) {
        return res.status(400).json({ error: 'One or more menu items not found' });
      }
      
      // Create order
      const order = orderRepository.create({
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
        
        const orderItem = orderItemRepository.create({
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
        const voucher = await voucherRepository.findOne({
          where: { code: voucherCode, isUsed: false }
        });
        
        if (!voucher) {
          return res.status(400).json({ error: 'Invalid or used voucher code' });
        }
        
        // Check if voucher has expired
        if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
          return res.status(400).json({ error: 'Voucher has expired' });
        }
        
        // Check minimum order amount if set
        if (voucher.minOrderAmount && subtotal < voucher.minOrderAmount) {
          return res.status(400).json({ 
            error: `Minimum order amount not met. Required: ₦${voucher.minOrderAmount}` 
          });
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
          return res.status(400).json({ 
            error: 'Insufficient wallet balance',
            required: order.total,
            available: user.wallet.balance
          });
        }
        
        // Deduct from wallet
        user.wallet.balance -= order.total;
        await queryRunner.manager.save(user.wallet);
        
        // Record transaction
        const walletTransaction = new WalletTransaction();
        walletTransaction.wallet = user.wallet;
        walletTransaction.amount = order.total;
        walletTransaction.type = TransactionType.PAYMENT;
        walletTransaction.referenceId = order.id;
        walletTransaction.description = `Payment for order #${order.orderNumber}`;
        walletTransaction.balanceAfter = user.wallet.balance;
        
        await queryRunner.manager.save(walletTransaction);
        
        // Update order payment status
        order.paymentStatus = PaymentStatus.PAID;
        order.status = OrderStatus.CONFIRMED;
      } else if (paymentMethod === PaymentMethod.VOUCHER) {
        if (!voucherCode) {
          return res.status(400).json({ error: 'Voucher code is required for voucher payment' });
        }
        
        // Payment already processed when applying voucher
        order.paymentStatus = PaymentStatus.PAID;
        order.status = OrderStatus.CONFIRMED;
      }
      
      await queryRunner.manager.save(order);
      
      // Commit transaction
      await queryRunner.commitTransaction();
      
      // Generate invoice
      const invoiceUrl = await this.invoiceService.generateInvoice(order);
      
      return res.status(201).json({
        message: 'Order placed successfully',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          restaurant: {
            id: restaurant.id,
            name: restaurant.name
          },
          subtotal: order.subtotal,
          discount: order.discount,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          items: orderItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal
          })),
          invoiceUrl
        }
      });
      
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      console.error('Create order error:', error);
      return res.status(500).json({ error: 'An error occurred while creating the order' });
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async getUserOrders(req: Request, res: Response): Promise<Response> {
    try {
      const orderRepository = getRepository(Order);
      
      const orders = await orderRepository.find({
        where: { user: { id: req.user!.id } },
        relations: ['restaurant', 'orderItems'],
        order: { createdAt: 'DESC' }
      });
      
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
      
      return res.status(200).json({ orders: formattedOrders });
    } catch (error) {
      console.error('Get user orders error:', error);
      return res.status(500).json({ error: 'An error occurred while fetching orders' });
    }
  }

  async getOrderDetails(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const orderRepository = getRepository(Order);
      
      const order = await orderRepository.findOne({
        where: { id, user: { id: req.user!.id } },
        relations: ['restaurant', 'orderItems', 'user']
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Generate invoice URL
      const invoiceUrl = await this.invoiceService.generateInvoice(order);
      
      return res.status(200).json({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          restaurant: {
            id: order.restaurant.id,
            name: order.restaurant.name
          },
          customer: {
            name: order.user.fullName,
            email: order.user.email,
            phone: order.user.phone
          },
          subtotal: order.subtotal,
          discount: order.discount,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          notes: order.notes,
          createdAt: order.createdAt,
          items: order.orderItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal
          })),
          invoiceUrl
        }
      });
    } catch (error) {
      console.error('Get order details error:', error);
      return res.status(500).json({ error: 'An error occurred while fetching order details' });
    }
  }

  async downloadInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orderRepository = getRepository(Order);
      
      const order = await orderRepository.findOne({
        where: { id, user: { id: req.user!.id } },
        relations: ['restaurant', 'orderItems', 'user']
      });
      
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      const pdfBuffer = await this.invoiceService.generateInvoicePdf(order);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Download invoice error:', error);
      res.status(500).json({ error: 'An error occurred while generating invoice' });
    }
  }
}
