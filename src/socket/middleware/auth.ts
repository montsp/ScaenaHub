import { Socket } from 'socket.io';
import { verifyToken } from '../../services/auth';

export const authenticateSocket = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers['authorization'];
  if (!token) {
    return next(new Error('認証トークンが必要です'));
  }
  try {
    const user = verifyToken(token.replace('Bearer ', ''));
    (socket as any).user = user;
    next();
  } catch (err) {
    next(new Error('認証に失敗しました'));
  }
}; 