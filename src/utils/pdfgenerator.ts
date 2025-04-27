import PDFDocument from "pdfkit"
import fs from "fs"
import path from "path"
import type { Order } from "../entities/Order"
import type { OrderItem } from "../entities/Order-Item"

interface InvoiceData {
  order: Order
  items: OrderItem[]
  customerName: string
  customerEmail: string
  customerAddress: string
  vendorName: string
  vendorAddress: string
}

export const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<string> => {
  const { order, items, customerName, customerEmail, customerAddress, vendorName, vendorAddress } = invoiceData

  // Create uploads/invoices directory if it doesn't exist
  const invoiceDir = path.join("uploads", "invoices")
  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true })
  }

  // Create a unique filename for the invoice
  const filename = `invoice-${order.id}-${Date.now()}.pdf`
  const filepath = path.join(invoiceDir, filename)

  // Create a new PDF document
  const doc = new PDFDocument({ margin: 50 })

  // Pipe the PDF to a file
  const stream = fs.createWriteStream(filepath)
  doc.pipe(stream)

  // Add company logo and header
  doc.fontSize(20).text("Chow Hub", { align: "center" })
  doc.fontSize(12).text("Food Delivery Service", { align: "center" })
  doc.moveDown()

  // Add invoice details
  doc.fontSize(16).text("INVOICE", { align: "right" })
  doc.fontSize(10).text(`#${order.id}`, { align: "right" })
  doc.fontSize(10).text(`Date: ${order.createdAt.toLocaleDateString()}`, { align: "right" })
  doc.moveDown()

  // Add customer and vendor information
  doc.fontSize(12).text("Bill To:", { continued: true })
  doc.moveDown()
  doc.fontSize(10).text(customerName)
  doc.fontSize(10).text(customerEmail)
  doc.fontSize(10).text(customerAddress)

  doc.moveUp(4)
  doc.text("Vendor:", { align: "right", continued: true })
  doc.moveDown()
  doc.fontSize(10).text(vendorName, { align: "right" })
  doc.fontSize(10).text(vendorAddress, { align: "right" })

  doc.moveDown(2)

  // Add table headers
  const tableTop = doc.y
  doc.fontSize(10)

  // Draw table headers
  doc.text("Item", 50, tableTop)
  doc.text("Qty", 300, tableTop, { width: 50, align: "right" })
  doc.text("Price", 350, tableTop, { width: 80, align: "right" })
  doc.text("Total", 430, tableTop, { width: 80, align: "right" })

  // Draw a line
  doc
    .moveTo(50, tableTop + 15)
    .lineTo(530, tableTop + 15)
    .stroke()

  // Add table rows
  let tableRowY = tableTop + 25

  items.forEach((item) => {
    doc.text(item.product.name, 50, tableRowY)
    doc.text(item.quantity.toString(), 300, tableRowY, { width: 50, align: "right" })
    doc.text(`$${item.price.toFixed(2)}`, 350, tableRowY, { width: 80, align: "right" })
    doc.text(`$${(item.quantity * item.price).toFixed(2)}`, 430, tableRowY, { width: 80, align: "right" })

    tableRowY += 20
  })

  // Draw a line
  doc.moveTo(50, tableRowY).lineTo(530, tableRowY).stroke()

  // Add totals
  tableRowY += 10
  doc.text("Subtotal:", 350, tableRowY, { width: 80, align: "right" })
  doc.text(`$${order.subtotal.toFixed(2)}`, 430, tableRowY, { width: 80, align: "right" })

  tableRowY += 20
  doc.text("Tax:", 350, tableRowY, { width: 80, align: "right" })

  tableRowY += 20
  doc.fontSize(12).text("Total:", 350, tableRowY, { width: 80, align: "right" })
  doc.fontSize(12).text(`$${order.total.toFixed(2)}`, 430, tableRowY, { width: 80, align: "right" })

  doc.moveDown(2)
  doc.fontSize(10).text("Payment Method:", { continued: true })
  doc.text(order.paymentMethod, { align: "left" })

  doc.moveUp()
  doc.text("Payment Status:", { align: "right", continued: true })
  doc.text(order.paymentStatus, { align: "right" })

  // Add footer
  doc.fontSize(10).text("Thank you for your order!", { align: "center" })
  doc.text("This invoice serves as proof of payment. Please show it to the vendor upon delivery.", { align: "center" })

  doc.end()

  return new Promise((resolve, reject) => {
    stream.on("finish", () => {
      resolve(filepath)
    })
    stream.on("error", reject)
  })
}
