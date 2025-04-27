import type { Request, Response, NextFunction } from "express"
import { Order, OrderStatus } from "../entities/Order"
import { Product } from "../entities/Product"
import { User } from "../entities/User"
import { Vendor } from "../entities/vendor"
import { AppError } from "../utils/appError"
// Removed deprecated getManager import
import { OrderItem } from "../entities/Order-Item"
import { AppDataSource } from "../data-source"

export class DashboardController {
  async getVendorDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      const vendorId = vendor.id

      // Get order statistics
      const orderRepository = AppDataSource.getRepository(Order)

      // Total orders
      const totalOrders = await orderRepository.count({ where: { vendorId } })

      // Pending orders
      const pendingOrders = await orderRepository.count({
        where: { vendorId, status: OrderStatus.PENDING },
      })

      // Processing orders
      const processingOrders = await orderRepository.count({
        where: { vendorId, status: OrderStatus.PROCESSING },
      })


      // Total revenue
      const revenueResult = await orderRepository
        .createQueryBuilder("order")
        .select("SUM(order.total)", "total")
        .where("order.vendorId = :vendorId", { vendorId })
        .andWhere("order.status = :status", { status: OrderStatus.DELIVERED })
        .getRawOne()

      const totalRevenue = revenueResult.total || 0

      // Product statistics
      const productRepository = AppDataSource.getRepository(Product)
      const totalProducts = await productRepository.count({ where: { vendorId } })
      const availableProducts = await productRepository.count({ where: { vendorId, isAvailable: true } })

      // Recent orders
      const recentOrders = await orderRepository.find({
        where: { vendorId },
        relations: ["user"],
        order: { createdAt: "DESC" },
        take: 5,
      })

      // Customer count (unique customers who have ordered)
      const customerCount = await orderRepository
        .createQueryBuilder("order")
        .select("COUNT(DISTINCT order.userId)", "count")
        .where("order.vendorId = :vendorId", { vendorId })
        .getRawOne()

      res.status(200).json({
        status: "success",
        data: {
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            processing: processingOrders,
       
          },
          revenue: {
            total: totalRevenue,
          },
          products: {
            total: totalProducts,
            available: availableProducts,
          },
          customers: {
            total: customerCount.count || 0,
          },
          recentOrders,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getVendorSales(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { period = "week" } = req.query

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      const vendorId = vendor.id

      // Calculate date range based on period
      const now = new Date()
      let startDate: Date

      switch (period) {
        case "day":
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case "week":
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
          break
        case "year":
          startDate = new Date(now)
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
      }

      // Get sales data
      const orderRepository = AppDataSource.getRepository(Order)

      // Daily sales for the period
      const salesData = await orderRepository
        .createQueryBuilder("order")
        .select("DATE(order.createdAt)", "date")
        .addSelect("SUM(order.total)", "total")
        .addSelect("COUNT(order.id)", "count")
        .where("order.vendorId = :vendorId", { vendorId })
        .andWhere("order.createdAt >= :startDate", { startDate })
        .andWhere("order.status != :status", { status: OrderStatus.CANCELLED })
        .groupBy("DATE(order.createdAt)")
        .orderBy("date", "ASC")
        .getRawMany()

      // Top selling products
      const topProducts = await AppDataSource.manager.query(
        `
        SELECT 
          p.id, 
          p.name, 
          SUM(oi.quantity) as quantity, 
          SUM(oi.quantity * oi.price) as revenue
        FROM 
          order_items oi
        JOIN 
          products p ON oi.productId = p.id
        JOIN 
          orders o ON oi.orderId = o.id
        WHERE 
          o.vendorId = $1
          AND o.createdAt >= $2
          AND o.status != $3
        GROUP BY 
          p.id, p.name
        ORDER BY 
          quantity DESC
        LIMIT 5
      `,
        [vendorId, startDate, OrderStatus.CANCELLED],
      )

      // Sales by payment method
      const paymentMethodSales = await orderRepository
        .createQueryBuilder("order")
        .select("order.paymentMethod", "method")
        .addSelect("COUNT(order.id)", "count")
        .addSelect("SUM(order.total)", "total")
        .where("order.vendorId = :vendorId", { vendorId })
        .andWhere("order.createdAt >= :startDate", { startDate })
        .andWhere("order.status != :status", { status: OrderStatus.CANCELLED })
        .groupBy("order.paymentMethod")
        .getRawMany()

      res.status(200).json({
        status: "success",
        data: {
          salesData,
          topProducts,
          paymentMethodSales,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getVendorOrderStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { period = "week" } = req.query

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      const vendorId = vendor.id

      // Calculate date range based on period
      const now = new Date()
      let startDate: Date

      switch (period) {
        case "day":
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case "week":
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
          break
        case "year":
          startDate = new Date(now)
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
      }

      // Get order statistics
      const orderRepository = AppDataSource.getRepository(Order)

      // Orders by status
      const ordersByStatus = await orderRepository
        .createQueryBuilder("order")
        .select("order.status", "status")
        .addSelect("COUNT(order.id)", "count")
        .where("order.vendorId = :vendorId", { vendorId })
        .andWhere("order.createdAt >= :startDate", { startDate })
        .groupBy("order.status")
        .getRawMany()

      // Orders by hour of day
      const ordersByHour = await orderRepository
        .createQueryBuilder("order")
        .select("EXTRACT(HOUR FROM order.createdAt)", "hour")
        .addSelect("COUNT(order.id)", "count")
        .where("order.vendorId = :vendorId", { vendorId })
        .andWhere("order.createdAt >= :startDate", { startDate })
        .groupBy("hour")
        .orderBy("hour", "ASC")
        .getRawMany()

      // Average order value
      const avgOrderValue = await orderRepository
        .createQueryBuilder("order")
        .select("AVG(order.total)", "average")
        .where("order.vendorId = :vendorId", { vendorId })
        .andWhere("order.createdAt >= :startDate", { startDate })
        .andWhere("order.status != :status", { status: OrderStatus.CANCELLED })
        .getRawOne()

      res.status(200).json({
        status: "success",
        data: {
          ordersByStatus,
          ordersByHour,
          avgOrderValue: avgOrderValue.average || 0,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getVendorProductStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      const vendorId = vendor.id

      // Get product statistics
      const productRepository = AppDataSource.getRepository(Product)

      // Products by category
      const productsByCategory = await productRepository
        .createQueryBuilder("product")
        .leftJoin("product.category", "category")
        .select("category.name", "category")
        .addSelect("COUNT(product.id)", "count")
        .where("product.vendorId = :vendorId", { vendorId })
        .groupBy("category.name")
        .getRawMany()

      // Products by availability
      const productsByAvailability = await productRepository
        .createQueryBuilder("product")
        .select("product.isAvailable", "isAvailable")
        .addSelect("COUNT(product.id)", "count")
        .where("product.vendorId = :vendorId", { vendorId })
        .groupBy("product.isAvailable")
        .getRawMany()

      // Products by rating
      const productsByRating = await productRepository
        .createQueryBuilder("product")
        .select("FLOOR(product.rating)", "rating")
        .addSelect("COUNT(product.id)", "count")
        .where("product.vendorId = :vendorId", { vendorId })
        .andWhere("product.totalRatings > 0")
        .groupBy("FLOOR(product.rating)")
        .orderBy("rating", "ASC")
        .getRawMany()

      res.status(200).json({
        status: "success",
        data: {
          productsByCategory,
          productsByAvailability,
          productsByRating,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getAdminDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      // Get overall statistics

      // User statistics
      const userRepository = AppDataSource.getRepository(User)
      const totalUsers = await userRepository.count()
      const totalCustomers = await userRepository.count({ where: { role: "customer" } })

      // Vendor statistics
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const totalVendors = await vendorRepository.count()
      const activeVendors = await vendorRepository.count({ where: { isActive: true } })

      // Product statistics
      const productRepository = AppDataSource.getRepository(Product)
      const totalProducts = await productRepository.count()

      // Order statistics
      const orderRepository = AppDataSource.getRepository(Order)
      const totalOrders = await orderRepository.count()

      // Revenue statistics
      const revenueResult = await orderRepository
        .createQueryBuilder("order")
        .select("SUM(order.total)", "total")
        .where("order.status = :status", { status: OrderStatus.DELIVERED })
        .getRawOne()

      const totalRevenue = revenueResult.total || 0

      // Recent orders
      const recentOrders = await orderRepository.find({
        relations: ["user", "vendor"],
        order: { createdAt: "DESC" },
        take: 5,
      })

      res.status(200).json({
        status: "success",
        data: {
          users: {
            total: totalUsers,
            customers: totalCustomers,
          },
          vendors: {
            total: totalVendors,
            active: activeVendors,
          },
          products: {
            total: totalProducts,
          },
          orders: {
            total: totalOrders,
          },
          revenue: {
            total: totalRevenue,
          },
          recentOrders,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getAdminSales(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = "month" } = req.query

      // Calculate date range based on period
      const now = new Date()
      let startDate: Date

      switch (period) {
        case "week":
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
          break
        case "year":
          startDate = new Date(now)
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
      }

      // Get sales data
      const orderRepository = AppDataSource.getRepository(Order)

      // Daily sales for the period
      const salesData = await orderRepository
        .createQueryBuilder("order")
        .select("DATE(order.createdAt)", "date")
        .addSelect("SUM(order.total)", "total")
        .addSelect("COUNT(order.id)", "count")
        .where("order.createdAt >= :startDate", { startDate })
        .andWhere("order.status != :status", { status: OrderStatus.CANCELLED })
        .groupBy("DATE(order.createdAt)")
        .orderBy("date", "ASC")
        .getRawMany()

      // Sales by vendor
      const salesByVendor = await orderRepository
        .createQueryBuilder("order")
        .leftJoin("order.vendor", "vendor")
        .select("vendor.id", "vendorId")
        .addSelect("vendor.name", "vendorName")
        .addSelect("SUM(order.total)", "total")
        .addSelect("COUNT(order.id)", "count")
        .where("order.createdAt >= :startDate", { startDate })
        .andWhere("order.status != :status", { status: OrderStatus.CANCELLED })
        .groupBy("vendor.id, vendor.name")
        .orderBy("total", "DESC")
        .getRawMany()

      // Sales by payment method
      const salesByPaymentMethod = await orderRepository
        .createQueryBuilder("order")
        .select("order.paymentMethod", "method")
        .addSelect("COUNT(order.id)", "count")
        .addSelect("SUM(order.total)", "total")
        .where("order.createdAt >= :startDate", { startDate })
        .andWhere("order.status != :status", { status: OrderStatus.CANCELLED })
        .groupBy("order.paymentMethod")
        .getRawMany()

      res.status(200).json({
        status: "success",
        data: {
          salesData,
          salesByVendor,
          salesByPaymentMethod,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getAdminVendorStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Get vendor statistics
      const vendorRepository = AppDataSource.getRepository(Vendor)

      // Vendors by verification status
      const vendorsByVerification = await vendorRepository
        .createQueryBuilder("vendor")
        .select("vendor.isVerified", "isVerified")
        .addSelect("COUNT(vendor.id)", "count")
        .groupBy("vendor.isVerified")
        .getRawMany()

      // Vendors by activity status
      const vendorsByActivity = await vendorRepository
        .createQueryBuilder("vendor")
        .select("vendor.isActive", "isActive")
        .addSelect("COUNT(vendor.id)", "count")
        .groupBy("vendor.isActive")
        .getRawMany()

      // Top vendors by revenue
      const orderRepository = AppDataSource.getRepository(Order)
      const topVendorsByRevenue = await orderRepository
        .createQueryBuilder("order")
        .leftJoin("order.vendor", "vendor")
        .select("vendor.id", "vendorId")
        .addSelect("vendor.name", "vendorName")
        .addSelect("SUM(order.total)", "total")
        .where("order.status = :status", { status: OrderStatus.DELIVERED })
        .groupBy("vendor.id, vendor.name")
        .orderBy("total", "DESC")
        .limit(5)
        .getRawMany()

      // Top vendors by order count
      const topVendorsByOrders = await orderRepository
        .createQueryBuilder("order")
        .leftJoin("order.vendor", "vendor")
        .select("vendor.id", "vendorId")
        .addSelect("vendor.name", "vendorName")
        .addSelect("COUNT(order.id)", "count")
        .groupBy("vendor.id, vendor.name")
        .orderBy("count", "DESC")
        .limit(5)
        .getRawMany()

      res.status(200).json({
        status: "success",
        data: {
          vendorsByVerification,
          vendorsByActivity,
          topVendorsByRevenue,
          topVendorsByOrders,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getAdminProductStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Get product statistics
      const productRepository = AppDataSource.getRepository(Product)

      // Products by category
      const productsByCategory = await productRepository
        .createQueryBuilder("product")
        .leftJoin("product.category", "category")
        .select("category.name", "category")
        .addSelect("COUNT(product.id)", "count")
        .groupBy("category.name")
        .getRawMany()

      // Products by availability
      const productsByAvailability = await productRepository
        .createQueryBuilder("product")
        .select("product.isAvailable", "isAvailable")
        .addSelect("COUNT(product.id)", "count")
        .groupBy("product.isAvailable")
        .getRawMany()

      // Top selling products
      const orderItemRepository = AppDataSource.getRepository(OrderItem)
      const topSellingProducts = await orderItemRepository
        .createQueryBuilder("orderItem")
        .leftJoin("orderItem.product", "product")
        .leftJoin("orderItem.order", "order")
        .select("product.id", "productId")
        .addSelect("product.name", "productName")
        .addSelect("SUM(orderItem.quantity)", "totalQuantity")
        .addSelect("SUM(orderItem.quantity * orderItem.price)", "totalRevenue")
        .where("order.status = :status", { status: OrderStatus.DELIVERED })
        .groupBy("product.id, product.name")
        .orderBy("totalQuantity", "DESC")
        .limit(10)
        .getRawMany()

      res.status(200).json({
        status: "success",
        data: {
          productsByCategory,
          productsByAvailability,
          topSellingProducts,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getAdminCustomerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = "month" } = req.query

      // Calculate date range based on period
      const now = new Date()
      let startDate: Date

      switch (period) {
        case "week":
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
          break
        case "year":
          startDate = new Date(now)
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
      }

      // Get user statistics
      const userRepository = AppDataSource.getRepository(User)

      // New users over time
      const newUsers = await userRepository
        .createQueryBuilder("user")
        .select("DATE(user.createdAt)", "date")
        .addSelect("COUNT(user.id)", "count")
        .where("user.createdAt >= :startDate", { startDate })
        .andWhere("user.role = :role", { role: "customer" })
        .groupBy("date")
        .orderBy("date", "ASC")
        .getRawMany()

      // Top customers by order count
      const orderRepository = AppDataSource.getRepository(Order)
      const topCustomersByOrders = await orderRepository
        .createQueryBuilder("order")
        .leftJoin("order.user", "user")
        .select("user.id", "userId")
        .addSelect("user.name", "userName")
        .addSelect("COUNT(order.id)", "orderCount")
        .where("order.createdAt >= :startDate", { startDate })
        .groupBy("user.id, user.name")
        .orderBy("orderCount", "DESC")
        .limit(5)
        .getRawMany()

      // Top customers by spending
      const topCustomersBySpending = await orderRepository
        .createQueryBuilder("order")
        .leftJoin("order.user", "user")
        .select("user.id", "userId")
        .addSelect("user.name", "userName")
        .addSelect("SUM(order.total)", "totalSpent")
        .where("order.createdAt >= :startDate", { startDate })
        .andWhere("order.status != :status", { status: OrderStatus.CANCELLED })
        .groupBy("user.id, user.name")
        .orderBy("totalSpent", "DESC")
        .limit(5)
        .getRawMany()

      res.status(200).json({
        status: "success",
        data: {
          newUsers,
          topCustomersByOrders,
          topCustomersBySpending,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}
