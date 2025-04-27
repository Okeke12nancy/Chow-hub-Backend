import { User } from '../entities/User';
import { AppDataSource } from '../data-source';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(user: User, updateData: Partial<User>): Promise<User> {
    this.userRepository.merge(user, updateData);
    return this.userRepository.save(user);
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      return null;
    }
    return user;
  }

  async changeUserPassword(user: User, newPassword: string): Promise<void> {
    user.password = newPassword;
    await user.hashPassword();
    await this.userRepository.save(user);
  }
}