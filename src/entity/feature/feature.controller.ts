import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FeatureService } from './feature.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { EmailVerificationGuard } from '../../guards/email-verification.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UUIDPipe } from '../../pipes/uuid.pipe';
import { UpdateFeatureDto } from './dto/update-feature.dto';

@ApiTags('Features')
@ApiBearerAuth('jwt')
@Controller('features')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  @UseGuards(JwtAuthGuard, EmailVerificationGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Получить список features' })
  @ApiResponse({ status: 200, description: 'Список features' })
  async findAll() {
    return await this.featureService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, EmailVerificationGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Получить feature по ID' })
  @ApiParam({ name: 'id', description: 'ID feature в формате UUID v4' })
  @ApiResponse({ status: 200, description: 'Feature найдена' })
  async findOne(@Param('id', UUIDPipe) id: string) {
    return await this.featureService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, EmailVerificationGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Обновить feature' })
  @ApiParam({ name: 'id', description: 'ID feature в формате UUID v4' })
  @ApiBody({ type: UpdateFeatureDto })
  @ApiResponse({ status: 200, description: 'Feature обновлена' })
  async update(
    @Param('id', UUIDPipe) id: string,
    @Body() updateFeatureDto: UpdateFeatureDto,
  ) {
    return await this.featureService.update(id, updateFeatureDto);
  }
}
