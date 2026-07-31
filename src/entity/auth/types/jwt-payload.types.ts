export interface JwtPayload {
  userId: string;
  sessionId: string;
  email: string;
  iat?: number;
  exp?: number;
}
