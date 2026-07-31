import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create.dto';
import { UpdateRoleDto } from './dto/update.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { name, isActive: true },
    });
  }

  async finOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException('Роли не существует');
    }

    return role;
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Роль уже существует');
    }

    const role = this.roleRepository.create({
      ...createRoleDto,
      isActive: !createRoleDto.isActive ? createRoleDto.isActive : true,
    });

    return await this.roleRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.finOne(id);
    role.isActive = false;
    await this.roleRepository.save(role);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.finOne(id);

    Object.assign(role, updateRoleDto);

    return await this.roleRepository.save(role);
  }

  async seedDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        name: 'admin',
        displayName: 'Администратор',
        description: 'Полный доступ ко всему',
      },
      {
        name: 'moderator',
        displayName: 'Модератор',
        description: 'Управление контентом, просмотр пользователей',
      },
      {
        name: 'user',
        displayName: 'Пользователь',
        description: 'Базовые права',
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await this.findByName(roleData.name);
      if (!existingRole) {
        await this.create(roleData);
      }
    }
  }
}
