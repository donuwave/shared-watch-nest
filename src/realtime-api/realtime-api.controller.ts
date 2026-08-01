import { Controller, Get, Header } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('realtime-api')
export class RealtimeApiController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
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
  getAsyncApiSpec(): string {
    return this.readDocsFile('asyncapi.yaml');
  }

  @Get('events')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  getEventsMarkdown(): string {
    return this.readDocsFile('ws-events.md');
  }

  private readDocsFile(fileName: string): string {
    return readFileSync(join(process.cwd(), 'docs', fileName), 'utf8');
  }
}
