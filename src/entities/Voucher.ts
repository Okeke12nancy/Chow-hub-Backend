import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column('decimal', { precision: 10, scale: 2 })
  value: number;

  @Column({ default: false })
  isPercentage: boolean;

  @Column({ nullable: true })
  maxDiscount: number;

  @Column({ nullable: true })
  minOrderAmount: number;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ nullable: true })
  usedBy: string;

  @Column({ nullable: true })
  usedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
