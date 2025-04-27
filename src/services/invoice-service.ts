import { Order } from '../entity/Order';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';

export class InvoiceService {
  async generateInvoice(order: Order): Promise<string> {
    try {
      // In a real application, this would generate an actual PDF
      // and return a URL to download it
      
      // For demonstration purposes, we're just returning a mock URL
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
        
        // Collect PDF data chunks
        doc.on('data', (chunk) => bufferChunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(bufferChunks)));
        doc.on('error', reject);
        
        // Add company logo and details
        doc.fontSize(20).text('Chow Hub', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('CEMCS Cafeteria', { align: 'center' });
        doc.fontSize(10).text('Invoice', { align: 'center' });
        doc.moveDown();
        
        // Add invoice details
        doc.fontSize(12).text(`Invoice #: ${order.orderNumber}`);
        doc.fontSize(10).text(`Date: ${order.createdAt.toLocaleString()}`);
        doc.moveDown();
        
        // Add customer details
        doc.fontSize(12).text('Customer Details:');
        doc.fontSize(10).text(`Name: ${order.user.fullName}`);
        doc.fontSize(10).text(`Email: ${order.user.email}`);
        doc.fontSize(10).text(`Phone: ${order.user.phone || 'N/A'}`);
        doc.moveDown();
        
        // Add restaurant details
        doc.fontSize(12).text('Restaurant:');
        doc.fontSize(10).text(`${order.restaurant.name}`);
        doc.moveDown();
        
        // Add order items
        doc.fontSize(12).text('Order Items:');
        doc.moveDown(0.5);
        
        // Create a table for order items
        const itemsTableTop = doc.y;
        doc.fontSize(10);
        
        // Table headers
        let yPos = itemsTableTop;
        doc.text('Item', 50, yPos);
        doc.text('Quantity', 250, yPos);
        doc.text('Price', 350, yPos);
        doc.text('Subtotal', 450, yPos);
        yPos += 20;
        
        // Draw a horizontal line
        doc.moveTo(50, yPos - 10).lineTo(550, yPos - 10).stroke();
        
        // Table rows
        for (const item of order.orderItems) {
          doc.text(item.name, 50, yPos);
          doc.text(item.quantity.toString(), 250, yPos);
          doc.text(`₦${item.price.toFixed(2)}`, 350, yPos);
          doc.text(`₦${item.subtotal.toFixed(2)}`, 450, yPos);
          yPos += 20;
        }
        
        // Draw a horizontal line
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 20;
        
        // Order summary
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
        
        // Payment information
        doc.fontSize(10).text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);
        doc.moveDown();
        
        // Thank you message
        doc.fontSize(12).text('Thank you for your order!', { align: 'center' });
        
        // Finalize the PDF
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
}
