import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
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

@ApiTags('Users')
@ApiBearerAuth('jwt')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Получение всех пользователей' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  @ApiResponse({ status: 404, description: 'Список пользователей пуст' })
  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение пользователя по ID' })
  @ApiResponse({ status: 200, description: 'Пользователь найден' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async findOne(@Param('id', UUIDPipe) id: string): Promise<User> {
    return await this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, EmailVerificationGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Создание пользователей' })
  @ApiResponse({ status: 201, description: 'Пользователь создан успешно' })
  async create(@Body() createdUser: CreateUserDto): Promise<User> {
    return this.usersService.create(createdUser);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, EmailVerificationGuard)
  @ApiOperation({ summary: 'Обновление пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь изменен' })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя в формате UUID v4',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  async update(
    @Param('id', UUIDPipe) id: string,
    @Body() updatedUser: UpdateUserDto,
  ): Promise<User> {
    return await this.usersService.update(id, updatedUser);
  }

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard, EmailVerificationGuard)
  @ApiOperation({ summary: 'Изменить пароль пользователя' })
  @ApiResponse({ status: 200, description: 'Пароль успешно изменен' })
  @ApiResponse({ status: 400, description: 'Текущий пароль неверный' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя в формате UUID v4',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  async changePassword(
    @Param('id', UUIDPipe) id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<User> {
    return await this.usersService.changePassword(id, changePasswordDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, EmailVerificationGuard)
  @ApiOperation({ summary: 'Удаление пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь успешно удален' })
  async delete(@Param('id', UUIDPipe) id: string): Promise<User> {
    return await this.usersService.delete(id);
  }
}
