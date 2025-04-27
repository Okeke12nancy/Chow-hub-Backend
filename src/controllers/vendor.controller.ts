import type { Request, Response, NextFunction } from "express"
import { Vendor } from "../entities/vendor"
import { Product } from "../entities/Product"
import { User } from "..//entities//User"
import { AppError } from "../utils/appError"
import { AppDataSource } from "../data-source"

export class VendorController {
  async getAllVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorRepository = AppDataSource.getRepository(Vendor)

      const vendors = await vendorRepository.find({
        where: { isActive: true },
        select: ["id", "name", "description", "logo", "coverImage", "rating", "totalRatings"],
      })

      res.status(200).json({
        status: "success",
        results: vendors.length,
        data: {
          vendors,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getVendorById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const vendorRepository = AppDataSource.getRepository(Vendor)

      const vendor = await vendorRepository.findOne({
        where: { id: Number(id), isActive: true },
      })

      if (!vendor) {
        return next(new AppError("Vendor not found", 404))
      }

      res.status(200).json({
        status: "success",
        data: {
          vendor,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getVendorProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const productRepository = AppDataSource.getRepository(Product)

      const products = await productRepository.find({
        where: { vendorId: Number(id), isAvailable: true },
        relations: ["category"],
      })

      res.status(200).json({
        status: "success",
        results: products.length,
        data: {
          products,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getVendorProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const vendorRepository = AppDataSource.getRepository(Vendor)

      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      res.status(200).json({
        status: "success",
        data: {
          vendor,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateVendorProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { name, description, address, phone } = req.body

      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      // Update vendor fields
      vendor.name = name || vendor.name
      vendor.description = description || vendor.description
      vendor.address = address || vendor.address
      vendor.phone = phone || vendor.phone

      await vendorRepository.save(vendor)

      res.status(200).json({
        status: "success",
        data: {
          vendor,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async createVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, address, phone, userId } = req.body

      const userRepository = AppDataSource.getRepository(User)
      const user = await userRepository.findOne(userId)

      if (!user) {
        return next(new AppError("User not found", 404))
      }

      // Update user role to vendor
      user.role = "vendor"
      await userRepository.save(user)

      // Create vendor profile
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = vendorRepository.create({
        name,
        description,
        address,
        phone,
        userId,
      })

      await vendorRepository.save(vendor)

      res.status(201).json({
        status: "success",
        data: {
          vendor,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { name, description, address, phone, isVerified, isActive } = req.body

      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { id: Number(id) } })

      if (!vendor) {
        return next(new AppError("Vendor not found", 404))
      }

      // Update vendor fields
      vendor.name = name || vendor.name
      vendor.description = description || vendor.description
      vendor.address = address || vendor.address
      vendor.phone = phone || vendor.phone
      vendor.isVerified = isVerified !== undefined ? isVerified : vendor.isVerified
      vendor.isActive = isActive !== undefined ? isActive : vendor.isActive

      await vendorRepository.save(vendor)

      res.status(200).json({
        status: "success",
        data: {
          vendor,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async deleteVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const vendorRepository = AppDataSource.getRepository(Vendor)

      const vendor = await vendorRepository.findOne({ where: { id: Number(id) } })

      if (!vendor) {
        return next(new AppError("Vendor not found", 404))
      }

      await vendorRepository.remove(vendor)

      res.status(204).json({
        status: "success",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  async verifyVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const vendorRepository = AppDataSource.getRepository(Vendor)

      const vendor = await vendorRepository.findOne({ where: { id: Number(id) } })

      if (!vendor) {
        return next(new AppError("Vendor not found", 404))
      }

      vendor.isVerified = true
      await vendorRepository.save(vendor)

      res.status(200).json({
        status: "success",
        data: {
          vendor,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async toggleVendorStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { isActive } = req.body

      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { id: Number(id) } })

      if (!vendor) {
        return next(new AppError("Vendor not found", 404))
      }

      vendor.isActive = isActive
      await vendorRepository.save(vendor)

      res.status(200).json({
        status: "success",
        data: {
          vendor,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}
