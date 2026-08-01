# Frontend Auth Guide

Backend URL for local development:

```text
http://localhost:9000
```

Frontend URL expected by backend:

```text
http://localhost:3000
```

## Token Model

Backend uses two tokens:

- `accessToken` - short-lived JWT returned in response body.
- `refreshToken` - httpOnly cookie set by backend. Frontend cannot read it directly.

Frontend should store `accessToken` in app state. Do not put it in localStorage if it is not needed between page reloads. After page reload, restore auth state through `POST /auth/refresh`.

All requests that need auth should send:

```http
Authorization: Bearer <accessToken>
```

All requests that need refresh cookie should use credentials:

```ts
fetch(url, {
  credentials: 'include',
});
```

## Email Registration

### Register

```http
POST /auth/register
Content-Type: application/json
```

Body:

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "username": "donu"
}
```

Backend response is `accessToken` as a string and also sets `refreshToken` cookie.

After registration:

1. Save `accessToken` in app state.
2. Call `GET /auth/me`.
3. Show email verification state.

Frontend call:

```ts
const response = await fetch('http://localhost:9000/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123!',
    username: 'donu',
  }),
});

const accessToken = await response.text();
```

### Email Verification State

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

Response shape:

```json
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "donu",
    "discriminator": "1234",
    "avatarUrl": null,
    "role": "user"
  },
  "emailVerification": {
    "state": "verification_pending",
    "secondsUntilBlock": 86400,
    "isVerified": false,
    "emailVerificationDeadlineAt": "2026-08-02T00:00:00.000Z"
  }
}
```

Possible `emailVerification.state` values:

- `verified`
- `verification_pending`
- `verification_expired`

### Confirm Email

Email contains a link with `token`. Frontend should take that token and call:

```http
POST /auth/verify-email
Content-Type: application/json
```

Body:

```json
{
  "token": "email-token-from-url"
}
```

After success, call `GET /auth/me` again.

### Resend Email Verification

```http
POST /auth/resend-email-verification
Authorization: Bearer <accessToken>
```

Use this when user is logged in but email is not verified.

## Login

```http
POST /auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Backend response is `accessToken` as a string and also sets `refreshToken` cookie.

Frontend call:

```ts
const response = await fetch('http://localhost:9000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123!',
  }),
});

const accessToken = await response.text();
```

## Refresh After Reload

```http
POST /auth/refresh
Cookie: refreshToken=<httpOnly-cookie>
```

Frontend call:

```ts
const response = await fetch('http://localhost:9000/auth/refresh', {
  method: 'POST',
  credentials: 'include',
});

const accessToken = await response.text();
```

If refresh returns `401`, clear frontend auth state and show login screen.

## Logout

```http
POST /auth/logout
Authorization: Bearer <accessToken>
Cookie: refreshToken=<httpOnly-cookie>
```

Frontend call:

```ts
await fetch('http://localhost:9000/auth/logout', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  credentials: 'include',
});
```

After success, clear frontend `accessToken` from app state.

## Password Reset

### Request Reset Email

```http
POST /auth/forgot-password
Content-Type: application/json
```

Body:

```json
{
  "email": "user@example.com"
}
```

Backend always returns a neutral success message so frontend should not reveal whether email exists.

### Set New Password

Frontend receives `token` from reset link and calls:

```http
POST /auth/reset-password
Content-Type: application/json
```

Body:

```json
{
  "token": "password-reset-token-from-url",
  "newPassword": "NewPassword123!"
}
```

After success, send user to login screen. Backend terminates old sessions.

## Social OAuth

### Start Flow

Frontend should navigate browser to the provider start URL:

```text
http://localhost:9000/auth/github
http://localhost:9000/auth/google
http://localhost:9000/auth/vk
http://localhost:9000/auth/yandex
```

Do this as a full-page navigation, not as `fetch`, because OAuth needs redirects.

Example:

```ts
window.location.href = 'http://localhost:9000/auth/github';
window.location.href = 'http://localhost:9000/auth/google';
window.location.href = 'http://localhost:9000/auth/vk';
window.location.href = 'http://localhost:9000/auth/yandex';
```

### Callback Flow

Provider redirects user back to backend:

```text
http://localhost:9000/auth/github/callback
http://localhost:9000/auth/google/callback
http://localhost:9000/auth/vk/callback
http://localhost:9000/auth/yandex/callback
```

Backend then:

1. Validates OAuth `state`.
2. Reads provider profile.
3. Finds or creates local user.
4. Finds or creates `OAuthAccount`.
5. Creates local session.
6. Sets httpOnly `refreshToken` cookie.
7. Redirects browser to frontend:

```text
http://localhost:3000/oauth/callback?provider=github&status=success
http://localhost:3000/oauth/callback?provider=google&status=success
http://localhost:3000/oauth/callback?provider=vk&status=success
http://localhost:3000/oauth/callback?provider=yandex&status=success
```

### Frontend OAuth Callback Page

On `/oauth/callback`, frontend should:

1. Read `provider` and `status` from URL.
2. If `status=success`, call `POST /auth/refresh` with `credentials: 'include'`.
3. Save returned `accessToken` in app state.
4. Call `GET /auth/me`.
5. Redirect user to the app screen.

Example:

```ts
const refreshResponse = await fetch('http://localhost:9000/auth/refresh', {
  method: 'POST',
  credentials: 'include',
});

if (!refreshResponse.ok) {
  throw new Error('OAuth session refresh failed');
}

const accessToken = await refreshResponse.text();
```

Do not expect `accessToken` in the URL. Backend intentionally uses refresh cookie instead.

### Frontend OAuth Error

If OAuth callback fails after returning to backend, backend redirects to:

```text
http://localhost:3000/oauth/callback?provider=google&status=error&code=oauth_failed
```

`provider` can be `github`, `google`, `vk`, or `yandex`.

On `status=error`, frontend should show login screen with a generic social-login failure message.

## Error Handling

Common statuses:

- `400` - некорректный body или token.
- `401` - нет auth, access token невалиден или refresh token невалиден.
- `403` - auth есть, но доступа нет или требуется подтверждение email.
- `404` - сущность или token не найдены.
- `409` - email уже занят.
- `503` - SMTP недоступен или письмо не отправилось.

Все HTTP-ошибки возвращаются в едином формате из `docs/api-errors.md`.

When backend returns `403` with:

```json
{
  "message": "Требуется подтверждение email",
  "code": "EMAIL_VERIFICATION_EXPIRED"
}
```

Frontend should show email verification screen and offer resend.

## Current Provider Status

- Google OAuth: ready on backend.
- Yandex OAuth: ready on backend.
- GitHub OAuth: ready on backend.
- VK OAuth: ready on backend.
