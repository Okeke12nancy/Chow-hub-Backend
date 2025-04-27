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
import { Vendor } from "./vendor"
import { OrderItem } from "./Order-Item"
import { Category } from "./Category"

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  name!: string

  @Column({ type: "text", nullable: true })
  description!: string

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: number

  @Column({ nullable: true })
  image!: string

  @Column({ default: true })
  isAvailable!: boolean

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
  rating!: number

  @Column({ default: 0 })
  totalRatings!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @ManyToOne(
    () => Vendor,
    (vendor) => vendor.products,
  )
  @JoinColumn({ name: "vendorId" })
  vendor!: Vendor

  @Column()
  vendorId!: number

  @ManyToOne(
    () => Category,
    (category) => category.products,
  )
  @JoinColumn({ name: "categoryId" })
  category!: Category

  @Column()
  categoryId!: number

  @OneToMany(
    () => OrderItem,
    (orderItem) => orderItem.product,
  )
  orderItems!: OrderItem[]
}
