import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';

// Extend Socket interface to include user data
declare module 'socket.io' {
  interface Socket {
    userId?: string;
    userRoles?: string[];
  }
}

export const setupSocketServer = (httpServer: http.Server) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.id;
      socket.userRoles = decoded.roles;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id, 'User:', socket.userId);

    // Channel events
    socket.on('channel:join', (channelId: string) => {
      socket.join(channelId);
      console.log(`🔗 User ${socket.userId} joined channel ${channelId}`);
      console.log(`📊 Channel ${channelId} now has ${io.sockets.adapter.rooms.get(channelId)?.size || 0} members`);
    });

    socket.on('channel:leave', (channelId: string) => {
      socket.leave(channelId);
      console.log(`User ${socket.userId} left channel ${channelId}`);
    });

    // Message events
    socket.on('message:send', (data) => {
      // Broadcast to all users in the channel
      socket.to(data.channelId).emit('message:new', data);
    });

    socket.on('message:edit', (data) => {
      socket.to(data.channelId).emit('message:updated', data);
    });

    socket.on('message:delete', (data) => {
      socket.to(data.channelId).emit('message:deleted', data.messageId);
    });

    socket.on('message:reaction:add', (data) => {
      socket.to(data.channelId).emit('message:reaction', data);
    });

    socket.on('message:reaction:remove', (data) => {
      socket.to(data.channelId).emit('message:reaction', data);
    });

    // Typing indicators
    socket.on('typing:start', (channelId: string) => {
      socket.to(channelId).emit('user:typing', {
        channelId,
        userId: socket.userId,
        isTyping: true
      });
    });

    socket.on('typing:stop', (channelId: string) => {
      socket.to(channelId).emit('user:typing', {
        channelId,
        userId: socket.userId,
        isTyping: false
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}; 