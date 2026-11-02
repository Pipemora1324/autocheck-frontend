import type { SessionResponse, UserRole } from '../app/core/auth/auth.models';

export const sessionFor = (accessToken: string, role: UserRole = 'user', emailVerified = true): SessionResponse => ({
  user: { id: 'b8d5f05c-e4b2-4315-b4c5-c6dd2ee04abd', email: 'ana@example.com', role, emailVerified },
  accessToken,
  tokenType: 'Bearer',
  expiresIn: 900
});
