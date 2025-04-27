import { Order } from '../entities/Order';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';

export class InvoiceService {
  async generateInvoice(order: Order): Promise<string> {
    try {
      return `/api/orders/${order.id}/invoice`;
    } catch (error) {
      console.error('Generate invoice error:', error);
      throw new Error('Failed to generate invoice');
    }
  }

  async generateInvoicePdf(order: Order): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const bufferChunks: Buffer[] = [];
        const doc = new PDFDocument({ margin: 50 });
        
        doc.on('data', (chunk: Buffer) => bufferChunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(bufferChunks)));
        doc.on('error', reject);
        
        doc.fontSize(20).text('Chow Hub', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('CEMCS Cafeteria', { align: 'center' });
        doc.fontSize(10).text('Invoice', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12).text(`Invoice #: ${order.orderNumber}`);
        doc.fontSize(10).text(`Date: ${order.createdAt.toLocaleString()}`);
        doc.moveDown();
        
        // Add customer details
        doc.fontSize(12).text('Customer Details:');
        doc.fontSize(10).text(`Name: ${order.user.firstName} ${order.user.lastName}`);
        doc.fontSize(10).text(`Email: ${order.user.email}`);
        doc.fontSize(10).text(`Phone: ${order.user.phone || 'N/A'}`);
        doc.moveDown();
        
        doc.fontSize(12).text('Restaurant:');
        doc.fontSize(10).text(`${order.restaurant.name}`);
        doc.moveDown();
        
        doc.fontSize(12).text('Order Items:');
        doc.moveDown(0.5);
        
        const itemsTableTop = doc.y;
        doc.fontSize(10);
        
        let yPos = itemsTableTop;
        doc.text('Item', 50, yPos);
        doc.text('Quantity', 250, yPos);
        doc.text('Price', 350, yPos);
        doc.text('Subtotal', 450, yPos);
        yPos += 20;
        
        doc.moveTo(50, yPos - 10).lineTo(550, yPos - 10).stroke();
        
        for (const item of order.orderItems) {
          doc.text(item.name, 50, yPos);
          doc.text(item.quantity.toString(), 250, yPos);
          doc.text(`₦${item.price.toFixed(2)}`, 350, yPos);
          doc.text(`₦${item.subtotal.toFixed(2)}`, 450, yPos);
          yPos += 20;
        }
        
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 20;
        
        doc.text('Subtotal:', 350, yPos);
        doc.text(`₦${order.subtotal.toFixed(2)}`, 450, yPos);
        yPos += 20;
        
        if (order.discount > 0) {
          doc.text('Discount:', 350, yPos);
          doc.text(`₦${order.discount.toFixed(2)}`, 450, yPos);
          yPos += 20;
        }
        
        doc.fontSize(12).text('Total:', 350, yPos);
        doc.fontSize(12).text(`₦${order.total.toFixed(2)}`, 450, yPos);
        yPos += 40;
        
        doc.fontSize(10).text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);
        doc.moveDown();
        
        doc.fontSize(12).text('Thank you for your order!', { align: 'center' });
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
}
