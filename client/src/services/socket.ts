import { io, Socket } from 'socket.io-client';
import { Message, Channel, Notification, SocketEvents } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('🔌 Socket already connected, skipping');
      return;
    }

    if (this.isConnecting) {
      console.log('🔌 Socket connection already in progress, skipping');
      return;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = true;
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    console.log('🔌 Connecting to socket:', socketUrl);
    
    this.socket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true, // Force new connection to prevent reuse
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnecting = false;
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.handleReconnect();
    });

    // Authentication events
    this.socket.on('auth_error', (error) => {
      console.error('Socket authentication error:', error);
      this.isConnecting = false;
      // Token might be invalid, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Channel events
  joinChannel(channelId: string): void {
    console.log('🔗 Socket service: Joining channel:', channelId);
    this.socket?.emit('channel:join', channelId);
  }

  leaveChannel(channelId: string): void {
    this.socket?.emit('channel:leave', channelId);
  }

  // Message events
  sendMessage(channelId: string, content: string, mentions: string[] = []): void {
    this.socket?.emit('message:send', {
      channelId,
      content,
      mentions,
    });
  }

  editMessage(messageId: string, content: string): void {
    this.socket?.emit('message:edit', {
      messageId,
      content,
    });
  }

  deleteMessage(messageId: string): void {
    this.socket?.emit('message:delete', messageId);
  }

  addReaction(messageId: string, emoji: string): void {
    this.socket?.emit('message:reaction:add', {
      messageId,
      emoji,
    });
  }

  removeReaction(messageId: string, emoji: string): void {
    this.socket?.emit('message:reaction:remove', {
      messageId,
      emoji,
    });
  }

  // Typing indicators
  startTyping(channelId: string): void {
    this.socket?.emit('typing:start', channelId);
  }

  stopTyping(channelId: string): void {
    this.socket?.emit('typing:stop', channelId);
  }

  // Event listeners
  onMessage(callback: (message: Message) => void): void {
    console.log('🔧 Socket service: Adding message:new listener');
    this.socket?.on('message:new', (message: Message) => {
      console.log('🎯 Socket service received message:new event:', message);
      callback(message);
    });
  }

  onMessageUpdated(callback: (message: Message) => void): void {
    this.socket?.on('message:updated', callback);
  }

  onMessageDeleted(callback: (messageId: string) => void): void {
    this.socket?.on('message:deleted', callback);
  }

  onMessageReaction(callback: (messageId: string, reactions: any[]) => void): void {
    this.socket?.on('message:reaction', callback);
  }

  onChannelUpdated(callback: (channel: Channel) => void): void {
    this.socket?.on('channel:updated', callback);
  }

  onChannelDeleted(callback: (channelId: string) => void): void {
    this.socket?.on('channel:deleted', callback);
  }

  onUserTyping(callback: (channelId: string, userId: string, isTyping: boolean) => void): void {
    this.socket?.on('user:typing', callback);
  }

  onNotification(callback: (notification: Notification) => void): void {
    this.socket?.on('notification:mention', callback);
    this.socket?.on('notification:system', callback);
  }

  // Remove event listeners
  offMessage(callback?: (message: Message) => void): void {
    console.log('🔧 Socket service: Removing message:new listener');
    if (callback) {
      this.socket?.off('message:new', callback);
    } else {
      this.socket?.off('message:new');
    }
  }

  offMessageUpdated(callback?: (message: Message) => void): void {
    this.socket?.off('message:updated', callback);
  }

  offMessageDeleted(callback?: (messageId: string) => void): void {
    this.socket?.off('message:deleted', callback);
  }

  offMessageReaction(callback?: (messageId: string, reactions: any[]) => void): void {
    this.socket?.off('message:reaction', callback);
  }

  offChannelUpdated(callback?: (channel: Channel) => void): void {
    this.socket?.off('channel:updated', callback);
  }

  offChannelDeleted(callback?: (channelId: string) => void): void {
    this.socket?.off('channel:deleted', callback);
  }

  offUserTyping(callback?: (channelId: string, userId: string, isTyping: boolean) => void): void {
    this.socket?.off('user:typing', callback);
  }

  offNotification(callback?: (notification: Notification) => void): void {
    this.socket?.off('notification:mention', callback);
    this.socket?.off('notification:system', callback);
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService;