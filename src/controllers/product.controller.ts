// import { Request, Response } from 'express';
// import { Product, StockStatus } from '../entities/Product';
// import { ProductCategory } from '../entities/Product-Category';
// import upload from '../middlewares/upload';
// import { AppDataSource } from '../data-source';

// export const getAllProducts = async (req: Request, res: Response) => {
//   try {
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ message: 'Unauthorized: User not found' });
//     }
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ message: 'Unauthorized: User not found' });
//     }
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ message: 'Unauthorized: User not found' });
//     }
//     if (!req.user) {
//       return res.status(401).json({ message: 'Unauthorized: User not found' });
//     }
//     if (!req.user) {
//       return res.status(401).json({ message: 'Unauthorized: User not found' });
//     }
//     if (!req.user) {
//       return res.status(401).json({ message: 'Unauthorized: User not found' });
//     }
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ message: 'Unauthorized: User not found' });
//     }
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ message: 'Unauthorized: User not found' });
//     }
//     const { id: userId } = req.user;
//     const productRepository = AppDataSource.getRepository(Product);
    
//     const products = await productRepository.find({
//       where: { userId },
//       relations: ['category'],
//       order: { createdAt: 'DESC' }
//     });
    
//     res.status(200).json(products);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Failed to fetch products',
//       error: (error instanceof Error) ? error.message : 'Unknown error'
//     });
//   }
// };

// export const getProductById = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user?.id;
//     const { id } = req.params;
//     if (!userId) {
//       return res.status(400).json({ success: false, message: 'User ID is missing' });
//     }
    
    
//     const productRepository = AppDataSource.getRepository(Product);
//     const product = await productRepository.findOne({
//       where: { id, userId },
//       relations: ['category']
//     });
    
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
    
//     res.status(200).json(product);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Failed to fetch product',
//       error: (error instanceof Error) ? error.message : 'Unknown error'
//     });
//   }
// };


// export const createProduct = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user?.id;
//     const { id } = req.params;
//     if (!userId) {
//       return res.status(400).json({ success: false, message: 'User ID is missing' });
//     }
//     const productRepository = AppDataSource.getRepository(Product);

//     const categoryRepository = AppDataSource.getRepository(ProductCategory);
//     const category = await categoryRepository.findOne(req.body.categoryId);

//     if (!category) {
//       return res.status(404).json({ message: 'Category not found' });
//     }

//     const product = productRepository.create({
//       ...req.body,
//       userId,
//       imageUrl: req.file?.path || null,
//     });

//     await productRepository.save(product);

//     res.status(201).json(product);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Failed to create product',
//       error: (error instanceof Error) ? error.message : 'Unknown error',
//     });
//   }
// };



// export const updateProduct = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user?.id;
//     const { id } = req.params;
//     if (!userId) {
//       return res.status(400).json({ success: false, message: 'User ID is missing' });
//     }
    
//     const productRepository = AppDataSource.getRepository(Product);
//     const product = await productRepository.findOne({
//       where: { id, userId }
//     });
    
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
    
//     if (req.body.categoryId) {
//       const categoryRepository = AppDataSource.getRepository(ProductCategory);
//       const category = await categoryRepository.findOne(req.body.categoryId);
      
//       if (!category) {
//         return res.status(404).json({ message: 'Category not found' });
//       }
//     }
    
//     productRepository.merge(product, req.body);
//     const updatedProduct = await productRepository.save(product);
    
//     res.status(200).json(updatedProduct);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Failed to update product',
//       error: (error instanceof Error) ? error.message : 'Unknown error'
//     });
//   }
// };

// export const deleteProduct = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user?.id;
//     const { id } = req.params;
//     if (!userId) {
//       return res.status(400).json({ success: false, message: 'User ID is missing' });
//     }
    
//     const productRepository = AppDataSource.getRepository(Product);
//     const product = await productRepository.findOne({
//       where: { id, userId }
//     });
    
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
    
//     await productRepository.remove(product);
    
//     res.status(200).json({ message: 'Product deleted successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Failed to delete product',
//       error: (error instanceof Error) ? error.message : 'Unknown error'
//     });
//   }
// };

// export const getAllCategories = async (req: Request, res: Response) => {
//   try {
//     const categoryRepository = AppDataSource.getRepository(ProductCategory);
//     const categories = await categoryRepository.find({
//       order: { name: 'ASC' }
//     });
    
//     res.status(200).json(categories);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Failed to fetch categories',
//       error: (error instanceof Error) ? error.message : 'Unknown error'
//     });
//   }
// };

// export const getTopSellingProducts = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user?.id;
//     const { id } = req.params;
//     if (!userId) {
//       return res.status(400).json({ success: false, message: 'User ID is missing' });
//     }
//     const limit = parseInt(req.query.limit as string) || 5;
    
//     const productRepository = AppDataSource.getRepository(Product);
    
//     const products = await productRepository
//       .createQueryBuilder('product')
//       .where('product.userId = :userId', { userId })
//       .orderBy('product.totalOrders', 'DESC')
//       .limit(limit)
//       .getMany();
    
//     res.status(200).json(products);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Failed to fetch top selling products',
//       error: (error instanceof Error) ? error.message : 'Unknown error'
//     });
//   }
// };

import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { Product } from '../entities/Product';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  private handleError(res: Response, error: any, message: string) {
    console.error(error);
    res.status(500).json({
      message,
      error: (error instanceof Error) ? error.message : 'Unknown error'
    });
  }

  async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Unauthorized: User not found' });
        return;
      }
      
      const { id: userId } = req.user;
      const products = await this.productService.getAllProducts(userId);
      
      res.status(200).json(products);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch products');
    }
  }

  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is missing' });
        return;
      }
      
      const product = await this.productService.getProductById(id, userId);
      
      if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
      }
      
      res.status(200).json(product);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch product');
    }
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is missing' });
        return;
      }
      
      const imageUrl = req.file?.path;
      const product = await this.productService.createProduct(req.body, userId, imageUrl);
      
      res.status(201).json(product);
    } catch (error: any) {
      if (error.message === 'Category not found') {
        res.status(404).json({ message: error.message });
      } else {
        this.handleError(res, error, 'Failed to create product');
      }
    }
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is missing' });
        return;
      }
  
      const updateData: Partial<Product> = { ...req.body };
      
      if (req.file) {
        updateData.imageUrl = req.file.path; 
      }
  
      if (!updateData || Object.keys(updateData).length === 0) {
        res.status(400).json({ message: 'No update data provided' });
        return;
      }
      
      const updatedProduct = await this.productService.updateProduct(id, userId, updateData);
      res.status(200).json(updatedProduct);
    } catch (error: any) {
      // Error handling as in your original code
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is missing' });
        return;
      }
      
      await this.productService.deleteProduct(id, userId);
      res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error: any) {
      if (error.message === 'Product not found') {
        res.status(404).json({ message: error.message });
      } else {
        this.handleError(res, error, 'Failed to delete product');
      }
    }
  }

  async getTopSellingProducts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is missing' });
        return;
      }
      
      const limit = parseInt(req.query.limit as string) || 5;
      const products = await this.productService.getTopSellingProducts(userId, limit);
      
      res.status(200).json(products);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch top selling products');
    }
  }
}