import type { ActivityData, NotificationData } from '@opsflow/types';
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;

    this.socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Real-time event listeners
  onNotification(callback: (data: NotificationData) => void) {
    this.socket?.on('notification', callback);
  }

  onUserOnline(callback: (data: { userId: string; timestamp: Date }) => void) {
    this.socket?.on('userOnline', callback);
  }

  onUserOffline(callback: (data: { userId: string; timestamp: Date }) => void) {
    this.socket?.on('userOffline', callback);
  }

  onActivityUpdate(callback: (data: ActivityData) => void) {
    this.socket?.on('activityUpdate', callback);
  }

  onPresenceUpdate(callback: (data: { userId: string; status: string; lastSeen: Date }) => void) {
    this.socket?.on('presenceUpdate', callback);
  }

  onUserTyping(callback: (data: { userId: string; roomId: string }) => void) {
    this.socket?.on('userTyping', callback);
  }

  onUserStoppedTyping(callback: (data: { userId: string; roomId: string }) => void) {
    this.socket?.on('userStoppedTyping', callback);
  }

  // Emit events
  joinRoom(roomId: string) {
    this.socket?.emit('joinRoom', { roomId });
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leaveRoom', { roomId });
  }

  updateActivity(activity: string, metadata?: Record<string, unknown>) {
    this.socket?.emit('updateActivity', { activity, metadata });
  }

  updatePresence(status: 'online' | 'away' | 'busy' | 'offline') {
    this.socket?.emit('updatePresence', { status });
  }

  startTyping(roomId: string) {
    this.socket?.emit('typing', { roomId });
  }

  stopTyping(roomId: string) {
    this.socket?.emit('stopTyping', { roomId });
  }

  // Remove event listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  removeListener(event: string, callback?: (...args: unknown[]) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.removeAllListeners(event);
      }
    }
  }
}

export const socketService = new SocketService();
