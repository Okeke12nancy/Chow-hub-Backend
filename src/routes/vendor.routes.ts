import { Router } from "express"
import { VendorController } from "../controllers/vendor.controller"
import { protect, authorize } from "../middlewares/authMiddleware"

const router = Router()
const vendorController = new VendorController()

// Public routes
router.get("/", vendorController.getAllVendors)
router.get("/:id", vendorController.getVendorById)
router.get("/:id/products", vendorController.getVendorProducts)

// Protected routes
router.use(protect)

// Vendor routes
router.use("/profile", authorize("vendor"))
router.get("/profile", vendorController.getVendorProfile)
router.put("/profile", vendorController.updateVendorProfile)

// Admin routes
router.use(authorize("admin"))
router.post("/", vendorController.createVendor)
router.put("/:id", vendorController.updateVendor)
router.delete("/:id", vendorController.deleteVendor)
router.patch("/:id/verify", vendorController.verifyVendor)
router.patch("/:id/status", vendorController.toggleVendorStatus)

export default router
