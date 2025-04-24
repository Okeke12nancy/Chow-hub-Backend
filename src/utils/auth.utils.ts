import jwt from 'jsonwebtoken';
import { User } from '../entities/User';
import config from '../config/app';

export const generateToken = (user: User): string => {
  return jwt.sign(
    { id: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};
