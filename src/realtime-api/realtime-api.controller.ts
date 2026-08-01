import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { join } from 'path';

@ApiTags('Realtime API')
@Controller('realtime-api')
export class RealtimeApiController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Открыть HTML viewer для AsyncAPI realtime-документации',
  })
  @ApiResponse({ status: 200, description: 'HTML viewer' })
  getViewer(): string {
    return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shared Watch Realtime API</title>
    <link rel="stylesheet" href="https://unpkg.com/@asyncapi/react-component@3.1.4/styles/default.min.css" />
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #ffffff;
      }

      #asyncapi {
        min-height: 100vh;
      }

      .fallback {
        padding: 24px;
        color: #374151;
      }
    </style>
  </head>
  <body>
    <main id="asyncapi">
      <div class="fallback">
        Загружается AsyncAPI viewer.
      </div>
    </main>
    <script src="https://unpkg.com/@asyncapi/react-component@3.1.4/browser/standalone/index.js"></script>
    <script>
      AsyncApiStandalone.render(
        {
          schema: {
            url: '/realtime-api/asyncapi.yaml',
            options: { method: 'GET' }
          },
          config: {
            show: {
              sidebar: true
            }
          }
        },
        document.getElementById('asyncapi')
      );
    </script>
  </body>
</html>`;
  }

  @Get('asyncapi.yaml')
  @Header('Content-Type', 'application/yaml; charset=utf-8')
  @ApiOperation({ summary: 'Получить AsyncAPI spec для Socket.IO событий' })
  @ApiResponse({ status: 200, description: 'AsyncAPI YAML' })
  getAsyncApiSpec(): string {
    return this.readDocsFile('asyncapi.yaml');
  }

  @Get('events')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  @ApiOperation({ summary: 'Получить markdown-документацию Socket.IO событий' })
  @ApiResponse({
    status: 200,
    description: 'Markdown со списком realtime events',
  })
  getEventsMarkdown(): string {
    return this.readDocsFile('ws-events.md');
  }

  private readDocsFile(fileName: string): string {
    return readFileSync(join(process.cwd(), 'docs', fileName), 'utf8');
  }
}
