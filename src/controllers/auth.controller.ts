import type { Request, Response, NextFunction } from "express"
import { AppDataSource } from "../data-source"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { User } from "../entities/User"
import { Vendor } from "../entities/vendor"
import { AppError } from "../utils/appError"
import config from "../config/app"

export class AuthController {
  private generateToken(id: number, role: string): string {
    return jwt.sign({ id, role }, config.jwtSecret as jwt.Secret, {
      expiresIn: typeof config.jwtExpiresIn === "string" ? parseInt(config.jwtExpiresIn, 10) : config.jwtExpiresIn,
    })
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, phone, address } = req.body

      const userRepository = AppDataSource.getRepository(User)

      // Check if user already exists
      const existingUser = await userRepository.findOneBy({ email })
      if (existingUser) {
        return next(new AppError("User already exists with this email", 400))
      }

      const user = userRepository.create({
        name,
        email,
        password,
        phone,
        address,
        role: "customer",
      })

      await userRepository.save(user)

      const token = this.generateToken(user.id, user.role)

      res.status(201).json({
        status: "success",
        token,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async registerVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, phone, address, vendorName, vendorDescription } = req.body

      const userRepository = AppDataSource.getRepository(User)
      const vendorRepository = AppDataSource.getRepository(Vendor)

      // Check if user already exists
      const existingUser = await userRepository.findOneBy({ email })
      if (existingUser) {
        return next(new AppError("User already exists with this email", 400))
      }

      // Create new user with vendor role
      const user = userRepository.create({
        name,
        email,
        password,
        phone,
        address,
        role: "vendor",
      })

      await userRepository.save(user)

      // Create vendor profile
      const vendor = vendorRepository.create({
        name: vendorName,
        description: vendorDescription,
        address,
        phone,
        userId: user.id,
      })

      await vendorRepository.save(vendor)

      // Generate token
      const token = this.generateToken(user.id, user.role)

      res.status(201).json({
        status: "success",
        token,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          vendor: {
            id: vendor.id,
            name: vendor.name,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return next(new AppError("Please provide email and password", 400))
      }

      const userRepository = AppDataSource.getRepository(User)

      const user = await userRepository
        .createQueryBuilder("user")
        .addSelect("user.password")
        .where("user.email = :email", { email })
        .getOne()

      if (!user || !(await user.comparePassword(password))) {
        return next(new AppError("Incorrect email or password", 401))
      }

      const token = this.generateToken(user.id, user.role)

      delete (user as any).password

      res.status(200).json({
        status: "success",
        token,
        data: {
          user,
        },
      })
    } catch (error) {
      next(error)
    }
  }

 
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body
      const userId = req.user!.id

      const userRepository = AppDataSource.getRepository(User)
      const user = await userRepository
        .createQueryBuilder("user")
        .addSelect("user.password")
        .where("user.id = :id", { id: userId })
        .getOne()

      if (!user || !(await user.comparePassword(currentPassword))) {
        return next(new AppError("Your current password is incorrect", 401))
      }

      user.password = newPassword
      await userRepository.save(user)

      // Generate new token
      const token = this.generateToken(user.id, user.role)

      res.status(200).json({
        status: "success",
        token,
        message: "Password changed successfully",
      })
    } catch (error) {
      next(error)
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const userRepository = AppDataSource.getRepository(User)

      const user = await userRepository.findOneBy({ id: userId })

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
}
