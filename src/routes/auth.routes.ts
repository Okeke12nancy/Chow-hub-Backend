import { Router } from "express"
import { AuthController } from "../controllers/auth.controller"
import { protect } from "../middlewares/authMiddleware"

const router = Router()
const authController = new AuthController()

router.post("/register", authController.register)
router.post("/login", authController.login)
router.post("/vendor/register", authController.registerVendor)
router.post("/vendor/login", authController.login)
// router.post("/forgot-password", authController.forgotPassword)
// router.post("/reset-password/:token", authController.resetPassword)
router.post("/change-password", protect, authController.changePassword)
router.get("/me", protect, authController.getMe)

export default router
