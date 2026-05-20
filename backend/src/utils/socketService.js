let io;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust this for production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connecté : ${socket.id}`);

    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`🏠 Client ${socket.id} a rejoint le salon : ${room}`);
    });

    socket.on('technician_location_update', async (data) => {
      console.log(`📍 Position technicien ${data.technicienId} : ${data.latitude}, ${data.longitude}`);
      
      // Update database persistently
      try {
        const prisma = require('../config/prisma');
        await prisma.technicien.update({
          where: { id: Number(data.technicienId) },
          data: {
            latitude: data.latitude,
            longitude: data.longitude
          }
        });
      } catch (err) {
        console.error('Failed to update technician location in DB:', err.message);
      }

      // On retransmet à tout le monde (notamment au dashboard responsable)
      io.emit('technician_location_broadcast', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client déconnecté : ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io n\'est pas initialisé !');
  }
  return io;
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (io) {
    const room = `user:${userId}`;
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    const count = clientsInRoom ? clientsInRoom.size : 0;
    console.log(`📤 Envoi événement '${event}' à l'utilisateur ${userId} (${count} client(s) dans le salon ${room})`);
    io.to(room).emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToAll,
  emitToRoom,
  emitToUser,
};
