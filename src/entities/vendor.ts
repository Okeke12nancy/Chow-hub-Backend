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
  import { Product } from "./Product"
  import { Order } from "./Order"
  
  
  @Entity("vendors")
  export class Vendor {
    @PrimaryGeneratedColumn()
    id!: number
  
    @Column()
    name!: string
  
    @Column({ nullable: true })
    description!: string
  
    @Column({ nullable: true })
    logo!: string
  
    @Column({ nullable: true })
    coverImage!: string
  
    @Column({ nullable: true })
    address!: string
  
    @Column({ nullable: true })
    phone!: string
  
    @Column({ default: false })
    isVerified!: boolean
  
    @Column({ default: true })
    isActive!: boolean
  
    @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
    rating!: number
  
    @Column({ default: 0 })
    totalRatings!: number
  
    @CreateDateColumn()
    createdAt!: Date
  
    @UpdateDateColumn()
    updatedAt!: Date
  
    @ManyToOne(
      () => User,
      (user) => user.vendors,
    )
    @JoinColumn({ name: "userId" })
    user!: User
  
    @Column()
    userId!: number
  
    @OneToMany(
      () => Product,
      (product) => product.vendor,
    )
    products!: Product[]
  
    @OneToMany(
      () => Order,
      (order) => order.vendor,
    )
    orders!: Order[]
  }
  