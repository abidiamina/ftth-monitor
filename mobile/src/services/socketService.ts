import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    if (!env.apiBaseUrl) {
      console.warn('⚠️ env.apiBaseUrl est indéfini. Impossible d\'initialiser le socket.');
      return null;
    }

    // On enlève le /api de apiBaseUrl pour le socket si nécessaire
    const socketUrl = env.apiBaseUrl.replace('/api', '');
    socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket mobile connecté');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket mobile déconnecté');
    });
  }
  return socket;
};
