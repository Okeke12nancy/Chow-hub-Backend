import { Request, Response } from 'express';
import { Product, StockStatus } from '../entities/Product';
import { ProductCategory } from '../entities/Product-Category';
import upload from '../middlewares/upload';
import { AppDataSource } from '../data-source';

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    const { id: userId } = req.user;
    const productRepository = AppDataSource.getRepository(Product);
    
    const products = await productRepository.find({
      where: { userId },
      relations: ['category'],
      order: { createdAt: 'DESC' }
    });
    
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch products',
      error: (error instanceof Error) ? error.message : 'Unknown error'
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is missing' });
    }
    
    
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({
      where: { id, userId },
      relations: ['category']
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch product',
      error: (error instanceof Error) ? error.message : 'Unknown error'
    });
  }
};


export const createProduct = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is missing' });
    }
    const productRepository = AppDataSource.getRepository(Product);

    const categoryRepository = AppDataSource.getRepository(ProductCategory);
    const category = await categoryRepository.findOne(req.body.categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const product = productRepository.create({
      ...req.body,
      userId,
      imageUrl: req.file?.path || null,
    });

    await productRepository.save(product);

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to create product',
      error: (error instanceof Error) ? error.message : 'Unknown error',
    });
  }
};



export const updateProduct = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is missing' });
    }
    
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({
      where: { id, userId }
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (req.body.categoryId) {
      const categoryRepository = AppDataSource.getRepository(ProductCategory);
      const category = await categoryRepository.findOne(req.body.categoryId);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }
    
    productRepository.merge(product, req.body);
    const updatedProduct = await productRepository.save(product);
    
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to update product',
      error: (error instanceof Error) ? error.message : 'Unknown error'
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is missing' });
    }
    
    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({
      where: { id, userId }
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await productRepository.remove(product);
    
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to delete product',
      error: (error instanceof Error) ? error.message : 'Unknown error'
    });
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categoryRepository = AppDataSource.getRepository(ProductCategory);
    const categories = await categoryRepository.find({
      order: { name: 'ASC' }
    });
    
    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch categories',
      error: (error instanceof Error) ? error.message : 'Unknown error'
    });
  }
};

export const getTopSellingProducts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is missing' });
    }
    const limit = parseInt(req.query.limit as string) || 5;
    
    const productRepository = AppDataSource.getRepository(Product);
    
    const products = await productRepository
      .createQueryBuilder('product')
      .where('product.userId = :userId', { userId })
      .orderBy('product.totalOrders', 'DESC')
      .limit(limit)
      .getMany();
    
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch top selling products',
      error: (error instanceof Error) ? error.message : 'Unknown error'
    });
  }
};
