import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { generateToken } from '../utils/auth.utils';

const userRepository = AppDataSource.getRepository(User);

const handleError = (res: Response, error: any, message: string) => {
  console.error(error);
  res.status(500).json({ message, error: error.message });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, ...userData } = req.body;
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = userRepository.create(userData);
    const savedUser = await userRepository.save(user);
    const token = generateToken(userData.id);

    const { ...userWithoutPassword } = savedUser;
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    handleError(res, error, 'Failed to register user');
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await userRepository.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ user: userWithoutPassword, token });
  } catch (error) {
    handleError(res, error, 'Failed to login');
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.user as { id: string };
    const user = await userRepository.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    handleError(res, error, 'Failed to get user profile');
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is missing' });
    }

    const { password, ...updateData } = req.body;
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    userRepository.merge(user, updateData);
    const updatedUser = await userRepository.save(user);
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    handleError(res, error, 'Failed to update user profile');
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is missing' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.hashPassword();
    await userRepository.save(user);
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to change password');
  }
};
