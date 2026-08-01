import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { EmailToken } from '../src/entity/email-token/email-token.entity';
import { EmailTokenService } from '../src/entity/email-token/email-token.service';
import { OAuthAccount } from '../src/entity/oauth-account/oauth-account.entity';
import { RoleService } from '../src/entity/role/role.service';
import { Session } from '../src/entity/session/session.entity';
import { User } from '../src/entity/users/users.entity';
import { MailService } from '../src/integrations/mail/mail.service';
import { FeatureService } from '../src/entity/feature/feature.service';

type MailServiceMock = {
  sendEmailVerification: jest.Mock<Promise<void>, [string, string]>;
  sendPasswordReset: jest.Mock<Promise<void>, [string, string]>;
  sendTestEmail: jest.Mock<Promise<{ mode: 'log_only' }>, [string]>;
};

type TestHttpServer = Parameters<typeof request>[0];

const mailServiceMock: MailServiceMock = {
  sendEmailVerification: jest.fn<Promise<void>, [string, string]>(() =>
    Promise.resolve(),
  ),
  sendPasswordReset: jest.fn<Promise<void>, [string, string]>(() =>
    Promise.resolve(),
  ),
  sendTestEmail: jest.fn<Promise<{ mode: 'log_only' }>, [string]>(() =>
    Promise.resolve({ mode: 'log_only' }),
  ),
};

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let usersRepository: Repository<User>;
  let sessionsRepository: Repository<Session>;
  let emailTokensRepository: Repository<EmailToken>;
  let oauthAccountsRepository: Repository<OAuthAccount>;
  let emailTokenService: EmailTokenService;
  let roleService: RoleService;
  let featureService: FeatureService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mailServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    sessionsRepository = moduleFixture.get<Repository<Session>>(
      getRepositoryToken(Session),
    );
    emailTokensRepository = moduleFixture.get<Repository<EmailToken>>(
      getRepositoryToken(EmailToken),
    );
    oauthAccountsRepository = moduleFixture.get<Repository<OAuthAccount>>(
      getRepositoryToken(OAuthAccount),
    );
    emailTokenService = moduleFixture.get<EmailTokenService>(EmailTokenService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    featureService = moduleFixture.get<FeatureService>(FeatureService);

    await app.init();
    await roleService.seedDefaultRoles();
    await featureService.seedDefaultFeatures();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    await emailTokensRepository.createQueryBuilder().delete().execute();
    await oauthAccountsRepository.createQueryBuilder().delete().execute();
    await sessionsRepository.createQueryBuilder().delete().execute();
    await usersRepository.createQueryBuilder().delete().execute();
    await featureService.seedDefaultFeatures();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers user, sets refresh cookie, and verifies email', async () => {
    const registerResponse = await api()
      .post('/auth/register')
      .send({
        email: 'auth-register@example.com',
        password: 'Password123!',
        username: 'register-user',
      })
      .expect(201);

    const accessToken = registerResponse.text;
    const refreshCookie = getCookie(registerResponse, 'refreshToken');

    expect(accessToken).toEqual(expect.any(String));
    expect(accessToken.length).toBeGreaterThan(20);
    expect(refreshCookie).toBeDefined();
    expect(mailServiceMock.sendEmailVerification).toHaveBeenCalledWith(
      'auth-register@example.com',
      expect.any(String),
    );

    const meBeforeVerification = await api()
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meBeforeVerification.body).toMatchObject({
      profile: {
        email: 'auth-register@example.com',
        username: 'register-user',
        role: 'user',
      },
      emailVerification: {
        state: 'verification_pending',
        isVerified: false,
      },
    });

    const verificationToken =
      mailServiceMock.sendEmailVerification.mock.calls[0][1];

    await api()
      .post('/auth/verify-email')
      .send({ token: verificationToken })
      .expect(201);

    const meAfterVerification = await api()
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const meAfterVerificationBody = meAfterVerification.body as {
      emailVerification: {
        state: string;
        isVerified: boolean;
      };
    };

    expect(meAfterVerificationBody.emailVerification).toMatchObject({
      state: 'verified',
      isVerified: true,
    });
  });

  it('logs in, refreshes access token, and logs out current session', async () => {
    await createVerifiedUser({
      email: 'auth-login@example.com',
      password: 'Password123!',
      username: 'login-user',
    });

    const loginResponse = await api()
      .post('/auth/login')
      .send({
        email: 'auth-login@example.com',
        password: 'Password123!',
      })
      .expect(201);

    const accessToken = loginResponse.text;
    const refreshCookie = getCookie(loginResponse, 'refreshToken');

    expect(refreshCookie).toBeDefined();

    const refreshResponse = await api()
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(201);

    expect(refreshResponse.text).toEqual(expect.any(String));
    expect(refreshResponse.text.length).toBeGreaterThan(20);

    await api()
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie)
      .expect(201);

    await api().post('/auth/refresh').set('Cookie', refreshCookie).expect(401);
  });

  it('resets password and invalidates old sessions', async () => {
    await createVerifiedUser({
      email: 'auth-reset@example.com',
      password: 'Password123!',
      username: 'reset-user',
    });

    const loginResponse = await api()
      .post('/auth/login')
      .send({
        email: 'auth-reset@example.com',
        password: 'Password123!',
      })
      .expect(201);

    const oldRefreshCookie = getCookie(loginResponse, 'refreshToken');

    await api()
      .post('/auth/forgot-password')
      .send({
        email: 'auth-reset@example.com',
      })
      .expect(201);

    expect(mailServiceMock.sendPasswordReset).toHaveBeenCalledWith(
      'auth-reset@example.com',
      expect.any(String),
    );

    const resetToken = mailServiceMock.sendPasswordReset.mock.calls[0][1];

    await api()
      .post('/auth/reset-password')
      .send({
        token: resetToken,
        newPassword: 'NewPassword123!',
      })
      .expect(201);

    await api()
      .post('/auth/refresh')
      .set('Cookie', oldRefreshCookie)
      .expect(401);

    await api()
      .post('/auth/login')
      .send({
        email: 'auth-reset@example.com',
        password: 'Password123!',
      })
      .expect(401);

    await api()
      .post('/auth/login')
      .send({
        email: 'auth-reset@example.com',
        password: 'NewPassword123!',
      })
      .expect(201);
  });

  it('allows rooms.create only for verified users', async () => {
    const unverifiedRegisterResponse = await api()
      .post('/auth/register')
      .send({
        email: 'feature-unverified@example.com',
        password: 'Password123!',
        username: 'feature-unverified',
      })
      .expect(201);

    const unverifiedPayload = await usersRepository.findOneByOrFail({
      email: 'feature-unverified@example.com',
    });

    await expect(
      featureService.canUse(unverifiedPayload.id, 'rooms.create'),
    ).resolves.toBe(false);

    await api()
      .post('/auth/logout')
      .set('Authorization', `Bearer ${unverifiedRegisterResponse.text}`)
      .expect(201);

    await createVerifiedUser({
      email: 'feature-verified@example.com',
      password: 'Password123!',
      username: 'feature-verified',
    });

    const verifiedUser = await usersRepository.findOneByOrFail({
      email: 'feature-verified@example.com',
    });

    await expect(
      featureService.canUse(verifiedUser.id, 'rooms.create'),
    ).resolves.toBe(true);
  });

  async function createVerifiedUser(input: {
    email: string;
    password: string;
    username: string;
  }): Promise<void> {
    const registerResponse = await api()
      .post('/auth/register')
      .send(input)
      .expect(201);

    const user = await usersRepository.findOneByOrFail({ email: input.email });
    const token = await emailTokenService.createToken(user.id, 'email_verify');

    await api().post('/auth/verify-email').send({ token }).expect(201);

    const accessToken = registerResponse.text;

    await api()
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    mailServiceMock.sendEmailVerification.mockClear();
  }

  function api() {
    return request(app.getHttpServer() as TestHttpServer);
  }
});

function getCookie(response: request.Response, name: string): string {
  const cookiesHeader = response.headers['set-cookie'] as
    | string[]
    | string
    | undefined;
  const cookies = Array.isArray(cookiesHeader)
    ? cookiesHeader
    : [cookiesHeader];
  const cookie = cookies.find((value): value is string => {
    return typeof value === 'string' && value.startsWith(`${name}=`);
  });

  if (!cookie) {
    throw new Error(`Cookie ${name} is missing`);
  }

  return cookie.split(';')[0];
}
