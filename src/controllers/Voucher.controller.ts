import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Voucher } from '../entity/Voucher';

export class VoucherController {
  async validateVoucher(req: Request, res: Response): Promise<Response> {
    try {
      const { code, subtotal } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Voucher code is required' });
      }
      
      const voucherRepository = getRepository(Voucher);
      
      const voucher = await voucherRepository.findOne({
        where: { code, isUsed: false }
      });
      
      if (!voucher) {
        return res.status(404).json({ error: 'Invalid or used voucher code' });
      }
      
      // Check if voucher has expired
      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'Voucher has expired' });
      }
      
      // Check minimum order amount if provided in request and voucher has minimum requirement
      if (subtotal && voucher.minOrderAmount && subtotal < voucher.minOrderAmount) {
        return res.status(400).json({ 
          error: `Minimum order amount not met`,
          minOrderAmount: voucher.minOrderAmount
        });
      }
      
      // Calculate discount if subtotal is provided
      let discount = null;
      
      if (subtotal) {
        if (voucher.isPercentage) {
          discount = (voucher.value / 100) * subtotal;
          
          // Apply max discount limit if set
          if (voucher.maxDiscount && discount > voucher.maxDiscount) {
            discount = voucher.maxDiscount;
          }
        } else {
          discount = voucher.value;
        }
      }
      
      return res.status(200).json({
        voucher: {
          code: voucher.code,
          value: voucher.value,
          isPercentage: voucher.isPercentage,
          maxDiscount: voucher.maxDiscount,
          minOrderAmount: voucher.minOrderAmount,
          discount
        },
        valid: true
      });
    } catch (error) {
      console.error('Validate voucher error:', error);
      return res.status(500).json({ error: 'An error occurred while validating voucher' });
    }
  }
}
