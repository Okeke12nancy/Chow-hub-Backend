import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    BeforeInsert,
  } from 'typeorm';
  import { Product } from '../entities/Product';
  import { Order } from '../entities/Order';
  import * as bcrypt from 'bcryptjs';
  
  @Entity('users')
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column()
    firstName!: string;
  
    @Column()
    lastName!: string;
  
    @Column({ unique: true })
    email!: string;
  
    @Column({nullable:false})
    password!: string;
  
    @Column({ nullable: true })
    businessName!: string;
  
    @Column({ nullable: true })
    phoneNumber!: string;
  
    @Column({ nullable: true })
    bio!: string;
  
    @Column({ nullable: true })
    profileImage!: string;
  
    @Column({ default: 'vendor' })
    role!: string;
  
    @Column({ default: true })
    isActive!: boolean;
  
    @OneToMany(() => Product, (product) => product.user)
    products!: Product[];
  
    @OneToMany(() => Order, (order) => order.vendor)
    orders!: Order[];
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  
    @BeforeInsert()
    async hashPassword() {
      this.password = await bcrypt.hash(this.password, 10);
    }
  
    async comparePassword(password: string): Promise<boolean> {
      return bcrypt.compare(password, this.password);
    }
  }