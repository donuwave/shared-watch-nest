import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from './users.entity';
import { CreateUserDto } from './dto/create.dto';
import { UUIDPipe } from '../../pipes/uuid.pipe';
import { UpdateUserDto } from './dto/update.dto';
import { ChangePasswordDto } from './dto/updatePassword.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { EmailVerificationGuard } from '../../guards/email-verification.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.types';

@ApiTags('Users')
@ApiBearerAuth('jwt')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, EmailVerificationGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Получение всех пользователей' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Нужна роль admin или moderator' })
  @ApiResponse({ status: 404, description: 'Список пользователей пуст' })
  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получение пользователя по ID' })
  @ApiResponse({ status: 200, description: 'Пользователь найден' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({
    status: 403,
    description: 'Можно читать себя, либо нужна роль admin/moderator',
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async findOne(
    @Param('id', UUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<User> {
    await this.assertSelfOrRole(currentUser.userId, id, ['admin', 'moderator']);

    return await this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, EmailVerificationGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Создание пользователей' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Пользователь создан успешно' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Нужна роль admin или moderator' })
  @ApiResponse({ status: 409, description: 'Email уже занят' })
  async create(@Body() createdUser: CreateUserDto): Promise<User> {
    return this.usersService.create(createdUser);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, EmailVerificationGuard)
  @ApiOperation({ summary: 'Обновление пользователя' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Пользователь изменен' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({
    status: 403,
    description: 'Можно обновлять себя, либо нужна роль admin',
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя в формате UUID v4',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  async update(
    @Param('id', UUIDPipe) id: string,
    @Body() updatedUser: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<User> {
    await this.assertSelfOrRole(currentUser.userId, id, ['admin']);

    return await this.usersService.update(id, updatedUser);
  }

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard, EmailVerificationGuard)
  @ApiOperation({ summary: 'Изменить пароль пользователя' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Пароль успешно изменен' })
  @ApiResponse({ status: 400, description: 'Текущий пароль неверный' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Можно менять пароль только себе' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя в формате UUID v4',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  async changePassword(
    @Param('id', UUIDPipe) id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<User> {
    this.assertSelf(currentUser.userId, id);

    return await this.usersService.changePassword(id, changePasswordDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, EmailVerificationGuard)
  @ApiOperation({ summary: 'Удаление пользователя' })
  @ApiResponse({ status: 200, description: 'Пользователь успешно удален' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({
    status: 403,
    description: 'Можно удалить себя, либо нужна роль admin',
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async delete(
    @Param('id', UUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<User> {
    await this.assertSelfOrRole(currentUser.userId, id, ['admin']);

    return await this.usersService.delete(id);
  }

  private async assertSelfOrRole(
    currentUserId: string,
    targetUserId: string,
    allowedRoles: string[],
  ): Promise<void> {
    if (currentUserId === targetUserId) {
      return;
    }

    const currentUser = await this.usersService.findOne(currentUserId);
    const currentRole = currentUser.role?.name;

    if (currentRole && allowedRoles.includes(currentRole)) {
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private assertSelf(currentUserId: string, targetUserId: string): void {
    if (currentUserId !== targetUserId) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
