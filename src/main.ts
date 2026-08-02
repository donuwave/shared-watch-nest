import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { RoleService } from './entity/role/role.service';
import cookieParser from 'cookie-parser';
import { FeatureService } from './entity/feature/feature.service';
import { ApiExceptionFilter } from './filters/api-exception.filter';
import {
  createSwaggerDocument,
  getSwaggerCustomOptions,
} from './swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? 3000);

  const rolesService = app.get(RoleService);
  await rolesService.seedDefaultRoles();
  const featureService = app.get(FeatureService);
  await featureService.seedDefaultFeatures();

  const document = createSwaggerDocument(app);

  SwaggerModule.setup('api', app, document, getSwaggerCustomOptions());

  await app.listen(port);
}

void bootstrap();
