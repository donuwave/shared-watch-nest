import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { MailService } from './mail.service';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Post('test')
  @ApiOperation({ summary: 'Отправить тестовое письмо вне production' })
  @ApiResponse({ status: 201, description: 'Тестовое письмо отправлено' })
  @ApiResponse({ status: 404, description: 'Недоступно в production' })
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }

    const { mode } = await this.mailService.sendTestEmail(dto.email);

    return {
      message:
        mode === 'smtp'
          ? 'Тестовое письмо отправлено'
          : 'SMTP не настроен, тестовое письмо залогировано',
      mode,
    };
  }
}
