import { Router } from "express"
import { CategoryController } from "../controllers/category.controller"
import { protect, authorize } from "../middlewares/authMiddleware"

const router = Router()
const categoryController = new CategoryController()

// Public routes
router.get("/", categoryController.getAllCategories)
router.get("/:id", categoryController.getCategoryById)
router.get("/:id/products", categoryController.getCategoryProducts)

// Admin routes
router.use(protect)
router.use(authorize("admin"))

router.post("/", categoryController.createCategory)
router.put("/:id", categoryController.updateCategory)
router.delete("/:id", categoryController.deleteCategory)

export default router
