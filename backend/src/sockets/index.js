import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust according to your frontend URL
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    jwt.verify(token, process.env.JWT_SECRET || 'secretKey', (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded; // { id, username, role_name, factory_id }
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (Role: ${socket.user.role_name})`);
    
    // Join to planners_room if they are PLANNER/ADMIN or have auto-approve permission
    const perms = socket.user.permissions || [];
    const canApprove = socket.user.role_name === 'PLANNER' 
      || socket.user.role_name === 'ADMIN'
      || perms.includes('daily_tickets:auto_approve');
    if (canApprove) {
      socket.join('planners_room');
      console.log(`${socket.user.username} joined planners_room`);
    }

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
