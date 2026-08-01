import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './users.entity';
import { CreateUserDto } from './dto/create.dto';
import { UpdateUserDto } from './dto/update.dto';
import { ChangePasswordDto } from './dto/updatePassword.dto';
import { EmailVerification } from './types/email-verification.types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createdUser: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createdUser.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже создан');
    }

    const hashedPassword = await bcrypt.hash(createdUser.password, 10);

    const user = this.usersRepository.create({
      email: createdUser.email,
      password: hashedPassword,
      username: createdUser.username,
      discriminator: await this.generateDiscriminator(createdUser.username),
      avatarUrl: createdUser.avatarUrl ?? null,
      isEmailVerified: false,
      blocked: false,
      emailVerifiedAt: null,
      emailVerificationDeadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return await this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find({
      select: [
        'id',
        'email',
        'username',
        'discriminator',
        'avatarUrl',
        'isEmailVerified',
        'blocked',
        'createdAt',
        'updatedAt',
      ],
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Пользователя не существует');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Пользователя не существует');
    }

    return user;
  }

  async delete(id: string): Promise<User> {
    const user = await this.findOne(id);

    await this.usersRepository.delete(id);

    return user;
  }

  async update(id: string, updatedUser: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updatedUser.username && updatedUser.username !== user.username) {
      user.username = updatedUser.username;
      user.discriminator = await this.generateDiscriminator(
        updatedUser.username,
      );
    }

    if (updatedUser.avatarUrl !== undefined) {
      user.avatarUrl = updatedUser.avatarUrl;
    }

    return await this.usersRepository.save(user);
  }

  async changePassword(
    id: string,
    { newPassword, currentPassword }: ChangePasswordDto,
  ): Promise<User> {
    const user = await this.findOne(id);

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Текущий пароль неверный');
    }

    user.password = await bcrypt.hash(newPassword, 10);

    return await this.usersRepository.save(user);
  }

  async resetPassword(id: string, newPassword: string): Promise<User> {
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(newPassword, 10);

    return await this.usersRepository.save(user);
  }

  async save(user: User): Promise<User> {
    return await this.usersRepository.save(user);
  }

  getEmailVerificationState(user: User): EmailVerification {
    if (user.isEmailVerified) {
      return 'verified';
    }

    if (
      user.emailVerificationDeadlineAt &&
      user.emailVerificationDeadlineAt > new Date()
    ) {
      return 'verification_pending';
    }

    return 'verification_expired';
  }

  private async generateDiscriminator(username: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const discriminator = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');

      const existingUser = await this.usersRepository.findOne({
        where: { username, discriminator },
      });

      if (!existingUser) {
        return discriminator;
      }
    }

    throw new ConflictException('Не удалось подобрать свободный username');
  }
}
