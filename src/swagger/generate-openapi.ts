import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { createSwaggerDocument } from './swagger.config';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = createSwaggerDocument(app);
  const outputPath = resolve(process.cwd(), 'docs/swagger.json');

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();

  process.stdout.write(`Swagger file generated: ${outputPath}\n`);
}

void generateOpenApi();
