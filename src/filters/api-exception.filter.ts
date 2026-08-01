import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ExceptionResponseBody = {
  statusCode?: number;
  status?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  [key: string]: unknown;
};

type ApiErrorResponse = {
  statusCode: number;
  code: string;
  message: string;
  details: unknown;
  path: string;
  method: string;
  timestamp: string;
};

const defaultMessages: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Некорректный запрос',
  [HttpStatus.UNAUTHORIZED]: 'Не авторизован',
  [HttpStatus.FORBIDDEN]: 'Доступ запрещен',
  [HttpStatus.NOT_FOUND]: 'Не найдено',
  [HttpStatus.CONFLICT]: 'Конфликт данных',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Сервис временно недоступен',
};

const localizedMessages: Record<string, string> = {
  'Bad Request': 'Некорректный запрос',
  'Bad Request Exception': 'Некорректный запрос',
  Unauthorized: 'Не авторизован',
  'Unauthorized Exception': 'Не авторизован',
  Forbidden: 'Доступ запрещен',
  'Forbidden resource': 'Доступ запрещен',
  'Forbidden Exception': 'Доступ запрещен',
  'Not Found': 'Не найдено',
  'Not Found Exception': 'Не найдено',
  Conflict: 'Конфликт данных',
  'Conflict Exception': 'Конфликт данных',
  'Service Unavailable': 'Сервис временно недоступен',
  'Service Unavailable Exception': 'Сервис временно недоступен',
  'Internal server error': 'Внутренняя ошибка сервера',
  'Invalid credentials': 'Неверный email или пароль',
  'Invalid OAuth state': 'Некорректное состояние OAuth',
  'Invalid VK OAuth callback': 'Некорректный callback VK OAuth',
  'Yandex account email is required': 'Для аккаунта Yandex нужен email',
  'Google account email is required': 'Для аккаунта Google нужен email',
  'GitHub account email is required': 'Для аккаунта GitHub нужен email',
  'Invalid or expired refresh token': 'Refresh token некорректен или истек',
  'Insufficient permissions': 'Недостаточно прав',
  'User does not have a role assigned': 'Пользователю не назначена роль',
  'Feature does not exist': 'Фича не существует',
  'Feature is not available': 'Фича недоступна',
  'Email verification required': 'Требуется подтверждение email',
  'Token not found': 'Токен не найден',
  'Token already used': 'Токен уже использован',
  'Token expired': 'Токен истек',
  'Whiteboard stroke already exists': 'Штрих доски уже существует',
  'Whiteboard is available only on pause': 'Доска доступна только на паузе',
  'Whiteboard is not enabled': 'Доска не включена',
  'Video source is not set': 'Источник видео не установлен',
  'Unsupported video source': 'Источник видео не поддерживается',
  'Invalid video URL': 'Некорректная ссылка на видео',
  'Invalid video time': 'Некорректное время видео',
  'SMTP delivery failed': 'Не удалось отправить письмо через SMTP',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode = this.getStatusCode(exception);
    const exceptionResponse = this.getExceptionResponse(exception);
    const body = this.toApiErrorResponse(
      statusCode,
      exceptionResponse,
      request,
    );

    response.status(statusCode).json(body);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getExceptionResponse(
    exception: unknown,
  ): string | ExceptionResponseBody {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      return typeof response === 'string'
        ? response
        : (response as ExceptionResponseBody);
    }

    return 'Internal server error';
  }

  private toApiErrorResponse(
    statusCode: number,
    exceptionResponse: string | ExceptionResponseBody,
    request: Request,
  ): ApiErrorResponse {
    if (typeof exceptionResponse === 'string') {
      return {
        statusCode,
        code: this.getDefaultCode(statusCode),
        message: this.getMessage(exceptionResponse, statusCode),
        details: null,
        path: request.originalUrl,
        method: request.method,
        timestamp: new Date().toISOString(),
      };
    }

    const rawMessage = exceptionResponse.message;
    const isValidationError = Array.isArray(rawMessage);

    return {
      statusCode,
      code:
        typeof exceptionResponse.code === 'string'
          ? exceptionResponse.code
          : this.getDefaultCode(statusCode),
      message: isValidationError
        ? 'Ошибка валидации'
        : this.getMessage(rawMessage, statusCode),
      details: isValidationError
        ? rawMessage
        : this.getDetails(exceptionResponse),
      path: request.originalUrl,
      method: request.method,
      timestamp: new Date().toISOString(),
    };
  }

  private getMessage(
    message: string | string[] | undefined,
    statusCode: number,
  ): string {
    if (typeof message === 'string' && message) {
      if (message.startsWith('Cannot ')) {
        return 'Маршрут не найден';
      }

      return localizedMessages[message] ?? message;
    }

    return this.getDefaultMessage(statusCode);
  }

  private getDetails(response: ExceptionResponseBody): unknown {
    const details = Object.fromEntries(
      Object.entries(response).filter(([key]) => {
        return !['status', 'statusCode', 'message', 'error', 'code'].includes(
          key,
        );
      }),
    );

    return Object.keys(details).length > 0 ? details : null;
  }

  private getDefaultCode(statusCode: number): string {
    const statusName = HttpStatus[statusCode] as string | undefined;

    return statusName ?? 'INTERNAL_SERVER_ERROR';
  }

  private getDefaultMessage(statusCode: number): string {
    return defaultMessages[statusCode] ?? 'Внутренняя ошибка сервера';
  }
}
