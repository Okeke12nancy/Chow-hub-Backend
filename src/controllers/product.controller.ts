import type { Request, Response, NextFunction } from "express"
import { Product } from "../entities/Product"
import { Vendor } from "../entities/vendor"
import { Category } from "../entities/Category"
import { AppError } from "../utils/appError"
import { AppDataSource } from "../data-source"

export class ProductController {
  async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, search, minPrice, maxPrice, vendorId } = req.query

      const productRepository = AppDataSource.getRepository(Product)
      let queryBuilder = productRepository
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect("product.vendor", "vendor")
        .where("product.isAvailable = :isAvailable", { isAvailable: true })

      if (category) {
        queryBuilder = queryBuilder.andWhere("category.id = :categoryId", { categoryId: category })
      }

      if (search) {
        queryBuilder = queryBuilder.andWhere("(product.name ILIKE :search OR product.description ILIKE :search)", {
          search: `%${search}%`,
        })
      }

      if (minPrice) {
        queryBuilder = queryBuilder.andWhere("product.price >= :minPrice", { minPrice })
      }

      if (maxPrice) {
        queryBuilder = queryBuilder.andWhere("product.price <= :maxPrice", { maxPrice })
      }

      if (vendorId) {
        queryBuilder = queryBuilder.andWhere("vendor.id = :vendorId", { vendorId })
      }

      const products = await queryBuilder.getMany()

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

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const productRepository = AppDataSource.getRepository(Product)

      const product = await productRepository.findOne({
        where: { id: Number(id) },
        relations: ["category", "vendor"],
      })

      if (!product) {
        return next(new AppError("Product not found", 404))
      }

      res.status(200).json({
        status: "success",
        data: {
          product,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, price, categoryId, image } = req.body
      const userId = req.user!.id

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      // Check if category exists
      const categoryRepository = AppDataSource.getRepository(Category)
      const category = await categoryRepository.findOne(categoryId)

      if (!category) {
        return next(new AppError("Category not found", 404))
      }

      // Create product
      const productRepository = AppDataSource.getRepository(Product)
      const product = productRepository.create({
        name,
        description,
        price,
        image,
        vendorId: vendor.id,
        categoryId,
      })

      await productRepository.save(product)

      res.status(201).json({
        status: "success",
        data: {
          product,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { name, description, price, categoryId, image } = req.body
      const userId = req.user!.id

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      // Get product
      const productRepository = AppDataSource.getRepository(Product)
      const product = await productRepository.findOne({ where: { id: Number(id) } })

      if (!product) {
        return next(new AppError("Product not found", 404))
      }

      // Check if product belongs to vendor
      if (product.vendorId !== vendor.id && req.user!.role !== "admin") {
        return next(new AppError("You do not have permission to update this product", 403))
      }

      // Check if category exists if provided
      if (categoryId) {
        const categoryRepository = AppDataSource.getRepository(Category)
        const category = await categoryRepository.findOne(categoryId)

        if (!category) {
          return next(new AppError("Category not found", 404))
        }
      }

      // Update product
      product.name = name || product.name
      product.description = description || product.description
      product.price = price || product.price
      product.categoryId = categoryId || product.categoryId
      product.image = image || product.image

      await productRepository.save(product)

      res.status(200).json({
        status: "success",
        data: {
          product,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user!.id

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      // Get product
      const productRepository = AppDataSource.getRepository(Product)
      const product = await productRepository.findOne({ where: { id: Number(id) } })

      if (!product) {
        return next(new AppError("Product not found", 404))
      }

      // Check if product belongs to vendor
      if (product.vendorId !== vendor.id && req.user!.role !== "admin") {
        return next(new AppError("You do not have permission to delete this product", 403))
      }

      await productRepository.remove(product)

      res.status(204).json({
        status: "success",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  async toggleProductAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { isAvailable } = req.body
      const userId = req.user!.id

      // Get vendor ID for the current user
      const vendorRepository = AppDataSource.getRepository(Vendor)
      const vendor = await vendorRepository.findOne({ where: { userId } })

      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404))
      }

      // Get product
      const productRepository = AppDataSource.getRepository(Product)
      const product = await productRepository.findOneBy({ id: Number(id) })

      if (!product) {
        return next(new AppError("Product not found", 404))
      }

      // Check if product belongs to vendor
      if (product.vendorId !== vendor.id && req.user!.role !== "admin") {
        return next(new AppError("You do not have permission to update this product", 403))
      }

      product.isAvailable = isAvailable
      await productRepository.save(product)

      res.status(200).json({
        status: "success",
        data: {
          product,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}
