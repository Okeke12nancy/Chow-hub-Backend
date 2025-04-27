import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm"
import { Order } from "./Order"
import { Product } from "./Product"

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  quantity!: number

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: number

  @ManyToOne(
    () => Order,
    (order) => order.items,
  )
  @JoinColumn({ name: "orderId" })
  order!: Order

  @Column()
  orderId!: string

  @ManyToOne(
    () => Product,
    (product) => product.orderItems,
  )
  @JoinColumn({ name: "productId" })
  product!: Product

  @Column()
  productId!: number
}
