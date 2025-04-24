import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
  } from 'typeorm';
  import { User } from './user.entity';
  import { OrderItem } from './orderItem.entity';
  import { ProductCategory } from './productCategory.entity';
  
  export enum StockStatus {
    IN_STOCK = 'In Stock',
    LOW_STOCK = 'Low Stock',
    OUT_OF_STOCK = 'Out of Stock',
  }
  
  @Entity('products')
  export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    name: string;
  
    @Column('text', { nullable: true })
    description: string;
  
    @Column('decimal', { precision: 10, scale: 2 })
    price: number;
  
    @Column({
      type: 'enum',
      enum: StockStatus,
      default: StockStatus.IN_STOCK,
    })
    stockStatus: StockStatus;
  
    @Column({ nullable: true })
    imageUrl: string;
  
    @Column({ default: true })
    isActive: boolean;
  
    @ManyToOne(() => ProductCategory, (category) => category.products)
    @JoinColumn({ name: 'categoryId' })
    category: ProductCategory;
  
    @Column()
    categoryId: string;
  
    @ManyToOne(() => User, (user) => user.products)
    @JoinColumn({ name: 'userId' })
    user: User;
  
    @Column()
    userId: string;
  
    @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
    orderItems: OrderItem[];
  
    @Column({ default: 0 })
    totalOrders: number;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }
  