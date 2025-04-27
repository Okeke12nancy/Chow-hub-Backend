import { AppDataSource } from '../data-source';
import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { User } from "../entities/User"
import { AppError } from "../utils/appError"
import config from '../config/app';

interface JwtPayload {
  id: number
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Not authorized to access this route", 401))
    }

    const token = authHeader.split(" ")[1]

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload

    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({ where: { id: decoded.id } })

    if (!user) {
      return next(new AppError("User no longer exists", 401))
    }

    req.user = user
    next()
  } catch (error) {
    return next(new AppError("Not authorized to access this route", 401))
  }
}

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not found", 401))
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403))
    }

    next()
  }
}
