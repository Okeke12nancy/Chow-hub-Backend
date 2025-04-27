// import {
//     Entity,
//     PrimaryGeneratedColumn,
//     Column,
//     CreateDateColumn,
//     UpdateDateColumn,
//     OneToMany,
//   } from 'typeorm';
//   import { Product } from './Product';
  
//   @Entity('product_categories')
//   export class ProductCategory {
//     @PrimaryGeneratedColumn('uuid')
//     id!: string;
  
//     @Column()
//     name!: string;
  
//     @Column({ nullable: true })
//     description!: string;
  
//     @OneToMany(() => Product, (product) => product.category)
//     products!: Product[];
  
//     @CreateDateColumn()
//     createdAt!: Date;
  
//     @UpdateDateColumn()
//     updatedAt!: Date;
//   }
  