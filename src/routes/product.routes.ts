import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/authMiddleware';
import upload from '../middlewares/upload';

const router = Router();
const productController = new ProductController();

router.get('/', authMiddleware, (req, res) => productController.getAllProducts(req, res));
router.get('/top-selling', authMiddleware, (req, res) => productController.getTopSellingProducts(req, res));
router.get('/:id', authMiddleware, (req, res) => productController.getProductById(req, res));
router.post('/upload', authMiddleware, upload.single('image'), (req, res) => productController.createProduct(req, res));
router.put('/:id', authMiddleware, upload.single('image'), (req, res) => 
    productController.updateProduct(req, res)
  );
router.delete('/:id', authMiddleware, (req, res) => productController.deleteProduct(req, res));

export default router;