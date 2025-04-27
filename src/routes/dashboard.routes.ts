import { Router } from "express"
import { DashboardController } from "../controllers/dashboard.controller"
import { protect, authorize } from "../middlewares/authMiddleware"

const router = Router()
const dashboardController = new DashboardController()

router.use(protect)

// Vendor dashboard
router.get("/vendor", authorize("vendor"), dashboardController.getVendorDashboard)
router.get("/vendor/sales", authorize("vendor"), dashboardController.getVendorSales)
router.get("/vendor/orders", authorize("vendor"), dashboardController.getVendorOrderStats)
router.get("/vendor/products", authorize("vendor"), dashboardController.getVendorProductStats)
// router.get("/vendor/customers", authorize("vendor"), dashboardController.getVendorCustomerStats)

// Admin dashboard
router.get("/admin", authorize("admin"), dashboardController.getAdminDashboard)
router.get("/admin/sales", authorize("admin"), dashboardController.getAdminSales)
router.get("/admin/vendors", authorize("admin"), dashboardController.getAdminVendorStats)
router.get("/admin/products", authorize("admin"), dashboardController.getAdminProductStats)
router.get("/admin/customers", authorize("admin"), dashboardController.getAdminCustomerStats)

export default router
