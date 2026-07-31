import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Session } from './session.entity';
import { CreateSessionDto } from './dto/create.dto';
import { ConfigService } from '@nestjs/config';
import { MoreThan, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    private configService: ConfigService,
  ) {}

  async getActiveSessionByUserId(userId: string): Promise<Session[]> {
    return await this.sessionsRepository.find({
      where: {
        userId,
        expiresAt: MoreThan(new Date()),
      },
      order: {
        lastActivityAt: 'DESC',
      },
    });
  }

  async create(createdSession: CreateSessionDto): Promise<Session> {
    const maxActiveSessions = await this.configService.get(
      'MAX_SESSIONS_PER_USER',
    );
    const activeSessions = await this.getActiveSessionByUserId(
      createdSession.userId,
    );

    // Удаляем самую старую сессию если мы достигли лимита
    if (maxActiveSessions <= activeSessions.length) {
      const oldestSession = activeSessions[activeSessions.length - 1];
      await this.sessionsRepository.delete(oldestSession.id);
    }

    // Создание сессии с висящим refreshToken
    const session = this.sessionsRepository.create({
      refreshToken: randomUUID(),
      ...createdSession,
      expiresAt: this.calculateExpiration(),
    });

    return await this.sessionsRepository.save(session);
  }

  async findOne(id: string): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Сессия не существует');
    }

    return session;
  }

  async findOneByRefreshToken(refreshToken: string): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { refreshToken },
    });

    if (!session) {
      throw new NotFoundException('Сессия не существует');
    }

    return session;
  }

  async terminate(id: string, userId: string) {
    const session = await this.findOne(id);

    if (session.userId !== userId) {
      throw new ForbiddenException('Нет доступа удалять сессию');
    }

    await this.sessionsRepository.delete({ id: session.id });
  }

  async terminateAll(userId: string): Promise<void> {
    await this.sessionsRepository.delete({ userId });
  }

  async terminateOthers(id: string, userId: string): Promise<void> {
    await this.sessionsRepository.delete({
      userId,
      id: Not(id),
    });
  }

  async updateActivity(sessionId: string): Promise<Session> {
    const session = await this.findOne(sessionId);

    session.lastActivityAt = new Date();
    return await this.sessionsRepository.save(session);
  }

  async updateRefreshToken(
    sessionId: string,
    refreshToken: string,
  ): Promise<void> {
    const session = await this.findOne(sessionId);
    session.refreshToken = refreshToken;
    await this.sessionsRepository.save(session);
  }

  //Вытащить функцию в отдельную утилит
  private calculateExpiration(): Date {
    const expirationSeconds =
      this.configService.get('app.sessionExpiration') || 604800;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expirationSeconds);
    return expiresAt;
  }
}
