// import 'reflect-metadata';
// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
//   ManyToOne,
//   JoinColumn,
// } from 'typeorm';

// import { Order } from './Order';
// import { Product } from './Product';

// @Entity('order_items')
// export class OrderItem {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column()
//   quantity!: number;

//   @Column('decimal', { precision: 10, scale: 2 })
//   unitPrice!: number;

//   @Column('decimal', { precision: 10, scale: 2 })
//   totalPrice!: number;

//   @ManyToOne(() => Order, (order) => order.items)
//   @JoinColumn({ name: 'orderId' })
//   order!: Order;

//   @Column()
//   orderId!: string;

//   @ManyToOne(() => Product, (product) => product.orderItems)
//   @JoinColumn({ name: 'productId' })
//   product!: Product;

//   @Column()
//   productId!: string;

//   @CreateDateColumn()
//   createdAt!: Date;

//   @UpdateDateColumn()
//   updatedAt!: Date;
// }


import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Order } from './Order';
import { MenuItem } from './MenuItem';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, order => order.orderItems)
  order: Order;

  @ManyToOne(() => MenuItem, menuItem => menuItem.orderItems)
  menuItem: MenuItem;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
