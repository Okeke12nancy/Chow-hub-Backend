import type { Request, Response, NextFunction } from "express"
import { Category } from "../entities/Category"
import { Product } from "../entities/Product"
import { AppError } from "../utils/appError"
import { AppDataSource } from "../config/database"

export class CategoryController {
  async getAllCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryRepository = AppDataSource.getRepository(Category)
      const categories = await categoryRepository.find()

      res.status(200).json({
        status: "success",
        results: categories.length,
        data: {
          categories,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const categoryRepository = AppDataSource.getRepository(Category)

      const category = await categoryRepository.findOne({ where: { id: Number(id) } })

      if (!category) {
        return next(new AppError("Category not found", 404))
      }

      res.status(200).json({
        status: "success",
        data: {
          category,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getCategoryProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const productRepository = AppDataSource.getRepository(Product)

      const products = await productRepository.find({
        where: { categoryId: Number(id), isAvailable: true },
        relations: ["vendor"],
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

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, image } = req.body

      const categoryRepository = AppDataSource.getRepository(Category)
      const category = categoryRepository.create({
        name,
        description,
        image,
      })

      await categoryRepository.save(category)

      res.status(201).json({
        status: "success",
        data: {
          category,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { name, description, image } = req.body

      const categoryRepository = AppDataSource.getRepository(Category)
      const category = await categoryRepository.findOne({ where: { id: Number(id) } })

      if (!category) {
        return next(new AppError("Category not found", 404))
      }

      // Update category fields
      category.name = name || category.name
      category.description = description || category.description
      category.image = image || category.image

      await categoryRepository.save(category)

      res.status(200).json({
        status: "success",
        data: {
          category,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const categoryRepository = AppDataSource.getRepository(Category)

      const category = await categoryRepository.findOne({ where: { id: Number(id) } })

      if (!category) {
        return next(new AppError("Category not found", 404))
      }

      // Check if category has products
      const productRepository = AppDataSource.getRepository(Product)
      const productCount = await productRepository.count({ where: { category: { id: category.id } } })

      if (productCount > 0) {
        return next(new AppError("Cannot delete category with associated products", 400))
      }

      await categoryRepository.remove(category)

      res.status(204).json({
        status: "success",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }
}
