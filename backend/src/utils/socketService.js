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

    socket.on('technician_location_update', (data) => {
      console.log(`📍 Position technicien ${data.technicienId} : ${data.latitude}, ${data.longitude}`);
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
    io.to(`user:${userId}`).emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToAll,
  emitToRoom,
  emitToUser,
};
