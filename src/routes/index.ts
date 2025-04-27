import { Router } from "express"
import authRoutes from "./auth.routes"
import userRoutes from "./user.routes"
import vendorRoutes from "./vendor.routes"
import productRoutes from "./products.routes"
import orderRoutes from "./order.routes"
import categoryRoutes from "./category.routes"
import dashboardRoutes from ".//dashboard.routes"

const router = Router()

router.use("/auth", authRoutes)
router.use("/users", userRoutes)
router.use("/vendors", vendorRoutes)
router.use("/products", productRoutes)
router.use("/orders", orderRoutes)
router.use("/categories", categoryRoutes)
router.use("/dashboard", dashboardRoutes)

export default router
