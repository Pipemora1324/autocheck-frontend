export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Respuesta de POST /auth/login, /auth/register y /auth/refresh. */
export interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface MessageResponse {
  message: string;
}

/** 'unknown' mientras se intenta restaurar la sesión al cargar la app. */
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';
