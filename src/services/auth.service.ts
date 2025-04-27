import { User } from '../entities/User';
import { Wallet } from '../entities/Wallet';
import { UserService } from '../services/user.service';
import { AppDataSource } from '../data-source';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthService {
  private userService: UserService;
  private walletRepository = AppDataSource.getRepository(Wallet);

  constructor() {
    this.userService = new UserService();
  }

  async registerUser(userData: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<{ user: User; token: string }> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await this.userService.create({
      ...userData,
      password: hashedPassword
    });

    const wallet = this.walletRepository.create({
      user,
      balance: 0
    });
    
    await this.walletRepository.save(wallet);

    const token = this.generateToken(user);

    return { user, token };
  }

  async loginUser(email: string, password: string): Promise<{ user: User; token: string } | null> {
    const user = await this.userService.findByEmailWithWallet(email);
    
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }

    const token = this.generateToken(user);

    return { user, token };
  }

  async changePassword(user: User, currentPassword: string, newPassword: string): Promise<boolean> {
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return false;
    }

    await this.userService.changeUserPassword(user, newPassword);
    return true;
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
  }
}