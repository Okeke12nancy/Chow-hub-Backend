import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { generateToken } from '../utils/auth.utils';

export const register = async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    
    const existingUser = await userRepository.findOne({ where: { email: req.body.email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    const user = userRepository.create(req.body);
    await userRepository.save(user);
    
    const token = generateToken(user);
    
    const { password, ...userWithoutPassword } = user;
    
    res.status(201).json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error(error as any);
    res.status(500).json({
      message: 'Failed to register user',
      error: (error as any).message
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const token = generateToken(user);
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(200).json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error(error as any);
    res.status(500).json({
      message: 'Failed to login',
      error: (error as any).message
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = user;
    
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error(error as any);
    res.status(500).json({
      message: 'Failed to get user profile',
      error: (error as any).message
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    const { password, ...updateData } = req.body;
    
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    userRepository.merge(user, updateData);
    const updatedUser = await userRepository.save(user);
    
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error(error as any);
    res.status(500).json({
      message: 'Failed to update user profile',
      error: (error as any).message
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }
    
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.hashPassword();
    await userRepository.save(user);
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error as any);
    res.status(500).json({
      message: 'Failed to change password',
      error: (error as any).message
    });
  }
};
