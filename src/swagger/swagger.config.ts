import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';

export function createSwaggerDocument(app: INestApplication) {
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

  return SwaggerModule.createDocument(app, config);
}

export function getSwaggerCustomOptions(): SwaggerCustomOptions {
  return {
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
      cookies: {
        enabled: true,
      },
    },
    customSiteTitle: 'Shared Watch API Docs',
  };
}
