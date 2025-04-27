import { Router } from "express"
import { ProductController } from "../controllers/product.controller"
import { protect, authorize } from "../middlewares/authMiddleware"

const router = Router()
const productController = new ProductController()

// Public routes
router.get("/", productController.getAllProducts)
router.get("/:id", productController.getProductById)

// Protected routes
router.use(protect)
router.use(authorize("vendor", "admin"))

router.post("/", productController.createProduct)
router.put("/:id", productController.updateProduct)
router.delete("/:id", productController.deleteProduct)
router.patch("/:id/availability", productController.toggleProductAvailability)

export default router
