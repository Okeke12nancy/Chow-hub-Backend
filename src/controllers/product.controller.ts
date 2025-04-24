import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Product, StockStatus } from '../entities/product.entity';
import { ProductCategory } from '../entities/productCategory.entity';
import upload from './middlewares/upload';

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user;
    const productRepository = getRepository(Product);
    
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
      error: error.message
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    
    const productRepository = getRepository(Product);
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
      error: error.message
    });
  }
};


export const createProduct = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user;
    const productRepository = getRepository(Product);

    // Check if category exists
    const categoryRepository = getRepository(ProductCategory);
    const category = await categoryRepository.findOne(req.body.categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Create new product
    const product = productRepository.create({
      ...req.body,
      userId,
      imageUrl: req.file ? req.file.path : null,
    });

    await productRepository.save(product);

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to create product',
      error: error.message,
    });
  }
};



export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    
    const productRepository = getRepository(Product);
    const product = await productRepository.findOne({
      where: { id, userId }
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if category exists if it's being updated
    if (req.body.categoryId) {
      const categoryRepository = getRepository(ProductCategory);
      const category = await categoryRepository.findOne(req.body.categoryId);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }
    
    // Update product
    productRepository.merge(product, req.body);
    const updatedProduct = await productRepository.save(product);
    
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to update product',
      error: error.message
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    
    const productRepository = getRepository(Product);
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
      error: error.message
    });
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categoryRepository = getRepository(ProductCategory);
    const categories = await categoryRepository.find({
      order: { name: 'ASC' }
    });
    
    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

export const getTopSellingProducts = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const productRepository = getRepository(Product);
    
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
      error: error.message
    });
  }
};
