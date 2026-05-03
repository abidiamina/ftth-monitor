import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';

// Determine Socket URL
const SOCKET_URL = env.socketUrl || env.apiBaseUrl.replace('/api', '');

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connecté au serveur');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket déconnecté');
    });
  }
  return socket;
};

export const joinUserRoom = (userId: number | string) => {
  const s = getSocket();
  if (s) {
    s.emit('join_room', `user:${userId}`);
    console.log(`🏠 Rejoint le salon : user:${userId}`);
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
