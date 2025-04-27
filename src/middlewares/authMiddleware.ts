import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../entities/User';
import { AppDataSource } from '../data-source';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return ;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
       res.status(401).json({ message: 'User not found' });
       return
    }

    req.user = user;
    next()
  } catch (error) {
    console.error('Auth middleware error:', error);
     res.status(401).json({ message: 'Invalid or expired token' });
     return
  }
};