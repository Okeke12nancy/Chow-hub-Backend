import { Router } from "express"
import { UserController } from "../controllers/user.controller"
import { protect, authorize } from "../middlewares/authMiddleware"

const router = Router()
const userController = new UserController()

router.use(protect)

router.get("/profile", userController.getProfile)
router.put("/profile", userController.updateProfile)
router.get("/orders", userController.getOrders)
router.get("/orders/:id", userController.getOrderById)

router.use(authorize("admin"))
router.get("/", userController.getAllUsers)
router.get("/:id", userController.getUserById)
router.put("/:id", userController.updateUser)
router.delete("/:id", userController.deleteUser)

export default router
