import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
} from "typeorm"
import bcrypt from "bcryptjs"
import { Order } from "./Order"
import { Vendor } from "../entities/vendor"

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  name!: string

  @Column({ unique: true })
  email!: string

  @Column({ select: false })
  password!: string

  @Column({ nullable: true })
  phone!: string

  @Column({ nullable: true })
  address!: string

  @Column({
    type: "enum",
    enum: ["customer", "vendor", "admin"],
    default: "customer",
  })
  role!: string

  @Column({ default: true })
  isActive!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @OneToMany(
    () => Order,
    (order) => order.user,
  )
  orders!: Order[]

  @OneToMany(
    () => Vendor,
    (vendor) => vendor.user,
  )
  vendors!: Vendor[]

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 12)
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password)
  }
}
