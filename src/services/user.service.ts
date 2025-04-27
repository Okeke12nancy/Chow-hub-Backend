import { User } from '../entities/User';
import { AppDataSource } from '../data-source';
import bcrypt from 'bcrypt';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithWallet(email: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { email },
      relations: ['wallet']
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByIdWithWallet(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['wallet']
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(user: User, updateData: Partial<User>): Promise<User> {
    this.userRepository.merge(user, updateData);
    return this.userRepository.save(user);
  }

  async changeUserPassword(user: User, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);
  }
}