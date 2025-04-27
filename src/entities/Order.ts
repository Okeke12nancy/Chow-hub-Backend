// import {
//     Entity,
//     PrimaryGeneratedColumn,
//     Column,
//     CreateDateColumn,
//     UpdateDateColumn,
//     ManyToOne,
//     OneToMany,
//     OneToOne,
//     JoinColumn,
//   } from 'typeorm';
//   import { User } from './User';
//   import { OrderItem } from './Order-Item';
//   import { Payment } from './Payment';
  
//   export enum OrderStatus {
//     PENDING = 'Pending',
//     PROCESSING = 'Processing',
//     DELIVERED = 'Delivered',
//     CANCELLED = 'Cancelled',
//   }
  
//   @Entity('orders')
//   export class Order {
//     @PrimaryGeneratedColumn('uuid')
//     id!: string;
  
//     @Column()
//     orderNumber!: string;
  
//     @Column({
//       type: 'enum',
//       enum: OrderStatus,
//       default: OrderStatus.PENDING,
//     })
//     status!: OrderStatus;
  
//     @Column('decimal', { precision: 10, scale: 2 })
//     totalAmount!: number;
  
//     @Column({ nullable: true })
//     customerName!: string;
  
//     @Column({ nullable: true })
//     customerEmail!: string;
  
//     @ManyToOne(() => User, (user) => user.orders)
//     @JoinColumn({ name: 'vendorId' })
//     vendor!: User;
  
//     @Column()
//     vendorId!: string;
  
//     @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
//     items!: OrderItem[];
  
//     @OneToOne(() => Payment, (payment) => payment.order)
//     payment!: Payment;
  
//     @Column({ nullable: true })
//     notes!: string;
  
//     @CreateDateColumn()
//     createdAt!: Date;
  
//     @UpdateDateColumn()
//     updatedAt!: Date;
//   }




import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { Restaurant } from './Restaurant';
import { OrderItem } from './OrderItem';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  WALLET = 'wallet',
  VOUCHER = 'voucher'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed'
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  orderNumber: string;

  @ManyToOne(() => User, user => user.orders)
  user: User;

  @ManyToOne(() => Restaurant)
  restaurant: Restaurant;

  @OneToMany(() => OrderItem, orderItem => orderItem.order, { cascade: true })
  orderItems: OrderItem[];

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus: PaymentStatus;

  @Column({ nullable: true })
  voucherCode: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}