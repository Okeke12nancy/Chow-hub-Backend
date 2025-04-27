import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm"
import { User } from "./User"
import { Vendor } from "./vendor"
import { OrderItem } from "./Order-Item"

export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  WALLET = "Wallet",
  Voucher = "Voucher",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus

  @Column({ type: "decimal", precision: 10, scale: 2 })
  subtotal!: number

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total!: number

  @Column({
    type: "enum",
    enum: PaymentMethod,
    default: PaymentMethod.Voucher,
  })
  paymentMethod!: PaymentMethod

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @ManyToOne(
    () => User,
    (user) => user.orders,
  )
  @JoinColumn({ name: "userId" })
  user!: User

  @Column()
  userId!: number

  @ManyToOne(
    () => Vendor,
    (vendor) => vendor.orders,
  )
  @JoinColumn({ name: "vendorId" })
  vendor!: Vendor

  @Column()
  vendorId!: number

  @OneToMany(
    () => OrderItem,
    (orderItem) => orderItem.order,
    {
      cascade: true,
    },
  )
  items!: OrderItem[]
}
