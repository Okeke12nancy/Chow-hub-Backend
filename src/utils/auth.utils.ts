import jwt from 'jsonwebtoken';
import { User } from '../entities/User';
import config from '../config/app';

export const generateToken = (user: User): string => {
  const { jwtSecret, jwtExpiresIn } = config;
  
  if (!jwtSecret) {
    throw new Error('JWT secret is not defined in configuration.');
  }
  
  if (!jwtExpiresIn) {
    throw new Error('JWT expiration is not defined in configuration.');
  }

  const payload = {
    id: user.id,
    role: user.role
  };
  
  return jwt.sign(payload, jwtSecret, { expiresIn: parseInt(jwtExpiresIn, 10) });
};