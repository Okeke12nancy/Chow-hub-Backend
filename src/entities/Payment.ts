import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
  } from 'typeorm';
  import { Order } from './Order';
  
  export enum PaymentStatus {
    PENDING = 'Pending',
    COMPLETED = 'Completed',
    FAILED = 'Failed',
  }
  
  export enum PaymentMethod {
    CREDIT_CARD = 'Credit Card',
    CASH_ON_DELIVERY = 'Cash on Delivery',
    MOBILE_PAYMENT = 'Mobile Payment',
    BANK_TRANSFER = 'Bank Transfer',
    VOUCHER = 'CEMCS Voucher',
  }
  
  @Entity('payments')
  export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column()
    transactionId!: string;
  
    @Column('decimal', { precision: 10, scale: 2 })
    amount!: number;
  
    @Column({
      type: 'enum',
      enum: PaymentMethod,
      default: PaymentMethod.CREDIT_CARD,
    })
    paymentMethod!: PaymentMethod;
  
    @Column({
      type: 'enum',
      enum: PaymentStatus,
      default: PaymentStatus.PENDING,
    })
    status!: PaymentStatus;
  
    @OneToOne(() => Order, (order) => order.payment)
    @JoinColumn({ name: 'orderId' })
    order!: Order;
  
    @Column()
    orderId!: string;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }
  