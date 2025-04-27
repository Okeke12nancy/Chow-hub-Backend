import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const userController = new UserController();

router.get('/profile', authMiddleware, (req, res) => userController.getProfile(req, res));
router.put('/profile', authMiddleware, (req, res) => userController.updateProfile(req, res));
router.post('/change-password', authMiddleware, (req, res) => userController.changePassword(req, res));

export default router;




//////////////////////////
// import { Router } from 'express';
// import { UserController } from '../controller/UserController';
// import { authenticate } from '../middleware/AuthMiddleware';

// const router = Router();
// const userController = new UserController();

// // Public routes
// router.post('/register', userController.register);
// router.post('/login', userController.login);

// // Protected routes
// router.get('/profile', authenticate, userController.getProfile);
// router.put('/profile', authenticate, userController.updateProfile);
// router.put('/change-password', authenticate, userController.changePassword);

// export default router;
