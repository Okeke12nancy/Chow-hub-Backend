import { AppDataSource } from '../data-source';
import { Product } from '../entities/Product';

export class ProductService {
  private productRepository = AppDataSource.getRepository(Product);

  async getAllProducts(userId: string) {
    return this.productRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async getProductById(id: string, userId: string) {
    return this.productRepository.findOne({
      where: { id, userId }
    });
  }

  async createProduct(productData: Partial<Product>, userId: string, imageUrl?: string) {
    const product = this.productRepository.create({
      ...productData,
      userId,
      imageUrl: imageUrl || productData.imageUrl,
    });

    return this.productRepository.save(product);
  }

  async updateProduct(id: string, userId: string, updateData: Partial<Product>) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('No update data provided');
    }

    const product = await this.productRepository.findOne({
      where: { id, userId }
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    await this.productRepository.update({ id, userId }, updateData);
    return this.productRepository.findOne({ where: { id, userId } });
  }

  async deleteProduct(id: string, userId: string) {
    const product = await this.productRepository.findOne({
      where: { id, userId }
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    return this.productRepository.remove(product);
  }


  async getTopSellingProducts(userId: string, limit: number = 5) {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.userId = :userId', { userId })
      .orderBy('product.totalOrders', 'DESC')
      .limit(limit)
      .getMany();
  }
}