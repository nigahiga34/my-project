const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

let users = {};

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('join', (username) => {
    users[username] = socket.id;
    socket.broadcast.emit('userJoined', username);
    socket.emit('users', Object.keys(users));
  });

  socket.on('offer', (data) => {
    console.log('Received offer');
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    console.log('Received answer');
    socket.broadcast.emit('answer', data);
  });

  socket.on('candidate', (data) => {
    console.log('Received candidate');
    socket.broadcast.emit('candidate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    delete users[socket.username];
    socket.broadcast.emit('userLeft', socket.username);
  });
});

server.listen(3000, () => {
  console.log('Server started on port 3000');
});