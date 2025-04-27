// import { User } from '../entities/User';
// import { generateToken } from '../utils/auth.utils';
// import { UserService } from './user.service';

// export class AuthService {
//   private userService: UserService;

//   constructor() {
//     this.userService = new UserService();
//   }

//   async register(userData: Partial<User>): Promise<{ user: Partial<User>, token: string }> {
//     const { email, ...rest } = userData;
    
//     if (!email) {
//       throw new Error('Email is required');
//     }
    
//     const existingUser = await this.userService.findByEmail(email);
//     if (existingUser) {
//       throw new Error('Email already in use');
//     }

//     const savedUser = await this.userService.create(userData);
//     const token = generateToken(savedUser);

//     const { password, ...userWithoutPassword } = savedUser;
//     return { user: userWithoutPassword, token };
//   }

//   async login(email: string, password: string): Promise<{ user: Partial<User>, token: string }> {
//     if (!email || !password) {
//       throw new Error('Email and password are required');
//     }

//     const user = await this.userService.validateCredentials(email, password);
//     if (!user) {
//       throw new Error('Invalid email or password');
//     }

//     const token = generateToken(user);
//     const { password: _, ...userWithoutPassword } = user;
//     return { user: userWithoutPassword, token };
//   }
// }




// src/controller/UserController.ts
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../entity/User';
import { Wallet } from '../entity/Wallet';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class UserController {
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { fullName, email, password, phone } = req.body;

      if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
      }

      const userRepository = getRepository(User);
      const walletRepository = getRepository(Wallet);

      // Check if user exists
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = userRepository.create({
        fullName,
        email,
        password: hashedPassword,
        phone
      });
      
      await userRepository.save(user);

      // Create wallet for user
      const wallet = walletRepository.create({
        user,
        balance: 0
      });
      
      await walletRepository.save(wallet);

      // Generate token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'An error occurred during registration' });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const userRepository = getRepository(User);
      
      // Find user by email
      const user = await userRepository.findOne({ 
        where: { email },
        relations: ['wallet']
      });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          walletBalance: user.wallet.balance
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'An error occurred during login' });
    }
  }

  async getProfile(req: Request, res: Response): Promise<Response> {
    try {
      const userRepository = getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user!.id },
        relations: ['wallet']
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          walletBalance: user.wallet.balance
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'An error occurred while fetching profile' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { fullName, phone } = req.body;
      const userRepository = getRepository(User);
      
      const user = await userRepository.findOne(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (fullName) user.fullName = fullName;
      if (phone) user.phone = phone;
      
      await userRepository.save(user);

      return res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'An error occurred while updating profile' });
    }
  }

  async changePassword(req: Request, res: Response): Promise<Response> {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      
      const userRepository = getRepository(User);
      const user = await userRepository.findOne(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      
      await userRepository.save(user);

      return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'An error occurred while changing password' });
    }
  }
}
