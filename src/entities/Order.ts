// src/entities/order.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    JoinColumn,
  } from 'typeorm';
  import { User } from './user.entity';
  import { OrderItem } from './orderItem.entity';
  import { Payment } from './payment.entity';
  
  export enum OrderStatus {
    PENDING = 'Pending',
    PROCESSING = 'Processing',
    DELIVERED = 'Delivered',
    CANCELLED = 'Cancelled',
  }
  
  @Entity('orders')
  export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    orderNumber: string;
  
    @Column({
      type: 'enum',
      enum: OrderStatus,
      default: OrderStatus.PENDING,
    })
    status: OrderStatus;
  
    @Column('decimal', { precision: 10, scale: 2 })
    totalAmount: number;
  
    @Column({ nullable: true })
    customerName: string;
  
    @Column({ nullable: true })
    customerEmail: string;
  
    @ManyToOne(() => User, (user) => user.orders)
    @JoinColumn({ name: 'vendorId' })
    vendor: User;
  
    @Column()
    vendorId: string;
  
    @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
    items: OrderItem[];
  
    @OneToOne(() => Payment, (payment) => payment.order)
    payment: Payment;
  
    @Column({ nullable: true })
    notes: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }