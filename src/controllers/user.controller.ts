import type { Request, Response, NextFunction } from "express"
import { User } from "../entities/User"
import { Order } from "../entities/Order"
import { AppError } from "../utils/appError"
import { AppDataSource } from "../data-source"

export class UserController {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const userRepository = AppDataSource.getRepository(User)
      const users = await userRepository.find({
        select: ["id", "name", "email", "role", "isActive", "createdAt"],
      })

      res.status(200).json({
        status: "success",
        results: users.length,
        data: {
          users,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userRepository = AppDataSource.getRepository(User)

      const user = await userRepository.findOne({
        where: { id: Number(id) },
        select: ["id", "name", "email", "phone", "address", "role", "isActive", "createdAt"],
      })

      if (!user) {
        return next(new AppError("User not found", 404))
      }

      res.status(200).json({
        status: "success",
        data: {
          user,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const userRepository = AppDataSource.getRepository(User)

      const user = await userRepository.findOne({ where: { id: userId } })

      if (!user) {
        return next(new AppError("User not found", 404))
      }

      res.status(200).json({
        status: "success",
        data: {
          user,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { name, phone, address } = req.body

      const userRepository = AppDataSource.getRepository(User)
      const user = await userRepository.findOne({ where: { id: userId } })

      if (!user) {
        return next(new AppError("User not found", 404))
      }

      // Update user fields
      user.name = name || user.name
      user.phone = phone || user.phone
      user.address = address || user.address

      await userRepository.save(user)

      res.status(200).json({
        status: "success",
        data: {
          user,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { name, email, phone, address, role, isActive } = req.body

      const userRepository = AppDataSource.getRepository(User)
      const user = await userRepository.findOne({ where: { id: Number(id) } })

      if (!user) {
        return next(new AppError("User not found", 404))
      }

      // Update user fields
      user.name = name || user.name
      user.email = email || user.email
      user.phone = phone || user.phone
      user.address = address || user.address
      user.role = role || user.role
      user.isActive = isActive !== undefined ? isActive : user.isActive

      await userRepository.save(user)

      res.status(200).json({
        status: "success",
        data: {
          user,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userRepository = AppDataSource.getRepository(User)

      const user = await userRepository.findOne({ where: { id: Number(id) } })

      if (!user) {
        return next(new AppError("User not found", 404))
      }

      await userRepository.remove(user)

      res.status(204).json({
        status: "success",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  async getOrders(req: Request, res: Response, next: NextFunction) {
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

  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { id } = req.params

      const orderRepository = AppDataSource.getRepository(Order)
      const order = await orderRepository.findOne({
        where: { id, userId },
        relations: ["items", "items.product", "vendor"],
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
}
