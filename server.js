const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (roomName) => {
    socket.join(roomName);
    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Set());
    }
    rooms.get(roomName).add(socket.id);

    socket.to(roomName).emit('user-joined', socket.id);

    console.log(`User ${socket.id} joined room ${roomName}`);
  });

  socket.on('leave', (roomName) => {
    socket.leave(roomName);
    if (rooms.has(roomName)) {
      rooms.get(roomName).delete(socket.id);
      if (rooms.get(roomName).size === 0) {
        rooms.delete(roomName);
      }
    }
    socket.to(roomName).emit('user-left', socket.id);

    console.log(`User ${socket.id} left room ${roomName}`);
  });

  socket.on('offer', ({ offer, to }) => {
    socket.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to }) => {
    socket.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  socket.on('message', ({ room, message }) => {
    socket.to(room).emit('message', { sender: socket.id, message });
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (rooms.has(room)) {
        rooms.get(room).delete(socket.id);
        if (rooms.get(room).size === 0) {
          rooms.delete(room);
        }
        socket.to(room).emit('user-left', socket.id);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});