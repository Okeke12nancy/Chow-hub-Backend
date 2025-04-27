import { Router } from "express"
import { OrderController } from "../controllers/order.controller"
import { protect, authorize } from "../middlewares/authMiddleware"

const router = Router()
const orderController = new OrderController()

// Protected routes
router.use(protect)

// Customer routes
router.post("/", orderController.createOrder)
router.get("/my-orders", orderController.getMyOrders)
router.get("/my-orders/:id", orderController.getMyOrderById)
router.get("/:id/invoice", orderController.generateInvoice)

// Vendor routes
router.get("/vendor-orders", authorize("vendor"), orderController.getVendorOrders)
router.get("/vendor-orders/:id", authorize("vendor"), orderController.getVendorOrderById)
router.patch("/:id/status", authorize("vendor"), orderController.updateOrderStatus)

// Admin routes
router.use(authorize("admin"))
router.get("/", orderController.getAllOrders)
router.get("/:id", orderController.getOrderById)
router.put("/:id", orderController.updateOrder)
router.delete("/:id", orderController.deleteOrder)

export default router
