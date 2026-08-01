import { NestFactory } from '@nestjs/core';
import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerCustomOptions,
} from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { RoleService } from './entity/role/role.service';
import cookieParser from 'cookie-parser';

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

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? 3000);

  const rolesService = app.get(RoleService);
  await rolesService.seedDefaultRoles();

  const config = new DocumentBuilder()
    .setTitle('Shared Watch API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'jwt',
    )
    .addCookieAuth('refreshToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refreshToken',
      description: 'Refresh token for obtaining new access tokens',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
      cookies: {
        enabled: true,
      },
    },
    customSiteTitle: 'Shared Watch API Docs',
  };

  SwaggerModule.setup('api', app, document, customOptions);

  await app.listen(port);
}

void bootstrap();
