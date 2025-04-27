import type { Request, Response, NextFunction } from "express"
import { Order, OrderStatus, PaymentMethod, PaymentStatus } from "../entities/Order"
import { OrderItem } from "../entities/Order-Item"
import { Product } from "../entities/Product"
import { Vendor } from "../entities/vendor"
import { AppError } from "../utils/appError"
import { generateInvoicePDF } from "../utils/pdfgenerator"
import { AppDataSource } from "../data-source"
import { EntityManager } from "typeorm"

export class OrderController {
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { vendorId, items, deliveryAddress, deliveryPhone, paymentMethod, notes } = req.body
      const userId = req.user!.id

      // Check if vendor exists
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne(vendorId)

      if (!vendor) {
        return next(new AppError("Vendor not found", 404))
      }

      // Validate items
      if (!items || !Array.isArray(items) || items.length === 0) {
        return next(new AppError("Order must contain at least one item", 400))
      }

      // Get product details and calculate total
      const productRepository = AppDataSource.getRepository(Product)
      let subtotal = 0
      const orderItems: OrderItem[] = []

      for (const item of items) {
        const product = await productRepository.findOne(item.productId)

        if (!product) {
          return next(new AppError(`Product with ID ${item.productId} not found`, 404))
        }

        if (!product.isAvailable) {
          return next(new AppError(`Product ${product.name} is not available`, 400))
        }

        const itemTotal = product.price * item.quantity
        subtotal += itemTotal

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        } as OrderItem)
      }



      // Create order using transaction
      const orderRepository = AppDataSource.getRepository(Order)
      const orderItemRepository = AppDataSource.getRepository(OrderItem)

      const result = await AppDataSource.manager.transaction(async (transactionalEntityManager: EntityManager) => {
        // Create order
        const newOrder = orderRepository.create({
          userId,
          vendorId,
          subtotal,
          deliveryAddress,
          deliveryPhone,
          paymentMethod: paymentMethod as PaymentMethod,
          notes,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        } as Partial<Order>)

        const savedOrder = await transactionalEntityManager.save(newOrder)

        // Create order items
        for (const item of orderItems) {
          const newOrderItem = orderItemRepository.create({
            ...item,
            orderId: savedOrder.id,
          })
          await transactionalEntityManager.save(newOrderItem)
        }

        return savedOrder
      })

      // Get complete order with items
      const completeOrder = await orderRepository.findOne({
        where: { id: result.id },
        relations: ["items", "items.product"],
      })

      res.status(201).json({
        status: "success",
        data: {
          order: completeOrder,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const orderRepository = AppDataSource.getRepository(Order)

      const orders = await orderRepository.find({
        where: { userId },
        relations: ["items", "items.product", "vendor"],
        order: { createdAt: "DESC" },
      })

      res.status(200).json({
        status: "success",
        results: orders.length,
        data: {
          orders,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getMyOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { id } = req.params

      const orderRepository = AppDataSource.getRepository(Order)
      const order = await orderRepository.findOne({
        where: { id, userId },
        relations: ["items", "items.product", "vendor", "user"],
      })

      if (!order) {
        return next(new AppError("Order not found", 404))
      }

      res.status(200).json({
        status: "success",
        data: {
          order,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getVendorOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      const { status } = req.query

      const orderRepository = AppDataSource.getRepository(Order)
      const query = {
        where: { vendorId: vendor.id },
        relations: ["items", "items.product", "user"],
        order: { createdAt: "DESC" as const },
      }

      // if (status) {
      //   query.where = { ...query.where, status: status as OrderStatus }
      // }

      const orders = await orderRepository.find(query)

      res.status(200).json({
        status: "success",
        results: orders.length,
        data: {
          orders,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getVendorOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { id } = req.params

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      const orderRepository = AppDataSource.getRepository(Order)
      const order = await orderRepository.findOne({
        where: { id, vendorId: vendor.id },
        relations: ["items", "items.product", "user"],
      })

      if (!order) {
        return next(new AppError("Order not found", 404))
      }

      res.status(200).json({
        status: "success",
        data: {
          order,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { id } = req.params
      const { status } = req.body

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      // Validate status
      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        return next(new AppError("Invalid order status", 400))
      }

      const orderRepository = AppDataSource.getRepository(Order)
      const order = await orderRepository.findOne({
        where: { id, vendorId: vendor.id },
      })

      if (!order) {
        return next(new AppError("Order not found", 404))
      }

      order.status = status as OrderStatus

      await orderRepository.save(order)

      res.status(200).json({
        status: "success",
        data: {
          order,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, vendorId, fromDate, toDate } = req.query

      const orderRepository = AppDataSource.getRepository(Order)
      let queryBuilder = orderRepository
        .createQueryBuilder("order")
        .leftJoinAndSelect("order.items", "items")
        .leftJoinAndSelect("items.product", "product")
        .leftJoinAndSelect("order.user", "user")
        .leftJoinAndSelect("order.vendor", "vendor")

      // Apply filters
      if (status) {
        queryBuilder = queryBuilder.andWhere("order.status = :status", { status })
      }

      if (vendorId) {
        queryBuilder = queryBuilder.andWhere("order.vendorId = :vendorId", { vendorId })
      }

      if (fromDate) {
        queryBuilder = queryBuilder.andWhere("order.createdAt >= :fromDate", { fromDate })
      }

      if (toDate) {
        queryBuilder = queryBuilder.andWhere("order.createdAt <= :toDate", { toDate })
      }

      queryBuilder = queryBuilder.orderBy("order.createdAt", "DESC")

      const orders = await queryBuilder.getMany()

      res.status(200).json({
        status: "success",
        results: orders.length,
        data: {
          orders,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const orderRepository = AppDataSource.getRepository(Order)
      const order = await orderRepository.findOne({
        where: { id },
        relations: ["items", "items.product", "user", "vendor"],
      })

      if (!order) {
        return next(new AppError("Order not found", 404))
      }

      res.status(200).json({
        status: "success",
        data: {
          order,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { status, paymentStatus } = req.body

      const orderRepository = AppDataSource.getRepository(Order)
      const order = await orderRepository.findOne({ where: { id } })

      if (!order) {
        return next(new AppError("Order not found", 404))
      }

      // Update order fields
      if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
        order.status = status as OrderStatus
      }

      if (paymentStatus && Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
        order.paymentStatus = paymentStatus as PaymentStatus
      }

      await orderRepository.save(order)

      res.status(200).json({
        status: "success",
        data: {
          order,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async deleteOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const orderRepository = AppDataSource.getRepository(Order)
      const order = await orderRepository.findOneBy({ id })

      if (!order) {
        return next(new AppError("Order not found", 404))
      }

      await orderRepository.remove(order)

      res.status(204).json({
        status: "success",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  async generateInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user!.id

      const orderRepository = AppDataSource.getRepository(Order)
      let order

      // Check if user is customer or vendor
      if (req.user!.role === "customer") {
        order = await orderRepository.findOne({
          where: { id, userId },
          relations: ["items", "items.product", "vendor", "user"],
        })
      } else if (req.user!.role === "vendor") {
        // Get vendor ID for the current user
        const vendorRepository = AppDataSource.getRepository(Vendor)
        const vendor = await vendorRepository.findOne({ where: { userId } })

        if (!vendor) {
          return next(new AppError("Vendor profile not found", 404))
        }

        order = await orderRepository.findOne({
          where: { id, vendorId: vendor.id },
          relations: ["items", "items.product", "vendor", "user"],
        })
      } else {
        // Admin can view any order
        order = await orderRepository.findOne({
          where: { id },
          relations: ["items", "items.product", "vendor", "user"],
        })
      }

      if (!order) {
        return next(new AppError("Order not found", 404))
      }

      // Generate invoice data for the response
      const invoiceData = {
        invoiceNumber: `INV-${order.id}`,
        orderDate: order.createdAt,
        customerName: order.user.name,
        customerEmail: order.user.email,
        customerAddress: order.user.address,
        items: order.items.map((item: OrderItem) => ({
          id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: order.subtotal,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        vendorName: order.vendor.name,
        vendorAddress: order.vendor.address,
      }

      res.status(200).json({
        status: "success",
        data: {
          invoice: invoiceData,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async downloadInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user!.id

      const orderRepository = AppDataSource.getRepository(Order)
      let order

      // Check if user is customer or vendor
      if (req.user!.role === "customer") {
        order = await orderRepository.findOne({
          where: { id, userId },
          relations: ["items", "items.product", "vendor", "user"],
        })
      } else if (req.user!.role === "vendor") {
        // Get vendor ID for the current user
        const vendorRepository = AppDataSource.getRepository(Vendor)
        const vendor = await vendorRepository.findOne({ where: { userId } })

        if (!vendor) {
          return next(new AppError("Vendor profile not found", 404))
        }

        order = await orderRepository.findOne({
          where: { id, vendorId: vendor.id },
          relations: ["items", "items.product", "vendor", "user"],
        })
      } else {
        // Admin can view any order
        order = await orderRepository.findOne({
          where: { id },
          relations: ["items", "items.product", "vendor", "user"],
        })
      }

      if (!order) {
        return next(new AppError("Order not found", 404))
      }

      // Generate PDF invoice
      const invoiceData = {
        order,
        items: order.items,
        customerName: order.user.name,
        customerEmail: order.user.email,
        customerAddress:  order.user.address,
        vendorName: order.vendor.name,
        vendorAddress: order.vendor.address,
      }

      const invoicePath = await generateInvoicePDF(invoiceData)

      // Send the PDF file
      res.download(invoicePath, `invoice-${order.id}.pdf`)
    } catch (error) {
      next(error)
    }
  }
}
