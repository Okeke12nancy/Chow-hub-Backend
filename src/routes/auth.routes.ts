import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import upload from '../middlewares/upload';

const router = Router();
const authController = new AuthController();

router.post('/register', upload.single('image'), (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

export default router;