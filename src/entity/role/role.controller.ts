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
import { RoleService } from './role.service';
import { Roles } from '../../decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateRoleDto } from './dto/create.dto';
import { UUIDPipe } from '../../pipes/uuid.pipe';
import { UpdateRoleDto } from './dto/update.dto';

@ApiTags('Roles')
@ApiBearerAuth('jwt')
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Создать новую роль' })
  @ApiResponse({ status: 201, description: 'Роль успешно создана' })
  @ApiResponse({ status: 403, description: 'Запрещено' })
  @ApiResponse({
    status: 409,
    description: 'Роль с таким именем уже существует',
  })
  @ApiBody({ type: CreateRoleDto })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return await this.roleService.create(createRoleDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Получить все активные роли (только админ)' })
  @ApiResponse({ status: 200, description: 'Список ролей' })
  @ApiResponse({ status: 403, description: 'Запрещено' })
  async findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Получить роль по ID (админ, модератор)' })
  @ApiResponse({ status: 200, description: 'Роль найдена' })
  @ApiResponse({ status: 404, description: 'Роль не найдена' })
  @ApiResponse({ status: 403, description: 'Запрещено' })
  @ApiParam({
    name: 'id',
    description: 'ID роли в формате UUID v4',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  async findOne(@Param('id', UUIDPipe) id: string) {
    return this.roleService.finOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Обновить роль (только админ)' })
  @ApiResponse({ status: 200, description: 'Роль успешно обновлена' })
  @ApiResponse({ status: 404, description: 'Роль не найдена' })
  @ApiResponse({ status: 403, description: 'Запрещено' })
  @ApiParam({
    name: 'id',
    description: 'ID роли в формате UUID v4',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiBearerAuth()
  async update(
    @Param('id', UUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Удалить роль (мягкое удаление, только админ)' })
  @ApiResponse({ status: 200, description: 'Роль успешно удалена' })
  @ApiResponse({ status: 404, description: 'Роль не найдена' })
  @ApiResponse({ status: 403, description: 'Запрещено' })
  @ApiParam({
    name: 'id',
    description: 'ID роли в формате UUID v4',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  @ApiBearerAuth()
  async remove(@Param('id', UUIDPipe) id: string) {
    await this.roleService.remove(id);
    return { message: 'Role successfully removed' };
  }
}
