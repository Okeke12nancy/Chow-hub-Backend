import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { User } from './User';
  import { PaymentMethod, PaymentStatus } from './Payment';
  
  @Entity('transactions')
  export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column()
    transactionId!: string;
  
    @Column({ nullable: true })
    orderNumber!: string;
  
    @Column('decimal', { precision: 10, scale: 2 })
    amount!: number;
  
    @Column({
      type: 'enum',
      enum: PaymentMethod,
      default: PaymentMethod.WALLET,
    })
    paymentMethod!: PaymentMethod;
  
    @Column({
      type: 'enum',
      enum: PaymentStatus,
      default: PaymentStatus.PENDING,
    })
    status!: PaymentStatus;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'vendorId' })
    vendor!: User;
  
    @Column()
    vendorId!: string;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }