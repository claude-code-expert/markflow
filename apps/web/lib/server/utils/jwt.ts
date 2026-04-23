import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DEFAULT = '7d';
const REFRESH_TOKEN_EXPIRY_REMEMBER = '30d';

function getSecrets() {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set');
  }
  return { jwtSecret, jwtRefreshSecret };
}

export function signAccessToken(payload: TokenPayload): string {
  const { jwtSecret } = getSecrets();
  return jwt.sign(payload, jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(payload: TokenPayload, rememberMe = false): string {
  const { jwtRefreshSecret } = getSecrets();
  const expiresIn = rememberMe ? REFRESH_TOKEN_EXPIRY_REMEMBER : REFRESH_TOKEN_EXPIRY_DEFAULT;
  return jwt.sign(payload, jwtRefreshSecret, { expiresIn });
}

export function signTokenPair(payload: TokenPayload, rememberMe = false): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload, rememberMe),
  };
}

export function verifyAccessToken(token: string): TokenPayload {
  const { jwtSecret } = getSecrets();
  return jwt.verify(token, jwtSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const { jwtRefreshSecret } = getSecrets();
  return jwt.verify(token, jwtRefreshSecret) as TokenPayload;
}

export function getRefreshTokenExpiry(rememberMe = false): Date {
  const days = rememberMe ? 30 : 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
