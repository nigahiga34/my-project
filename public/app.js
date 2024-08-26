// Connect to the Socket.IO server
const socket = io('http://localhost:3001');

// DOM elements
const messageContainer = document.getElementById('messageList');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const textButton = document.getElementById('textButton');
const voiceButton = document.getElementById('voiceButton');
const videoButton = document.getElementById('videoButton');
const callContainer = document.getElementById('callContainer');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const endCallButton = document.getElementById('endCallButton');

let peer;
let localStream;
let remoteStream;
let isInitiator = false;

// Function to add a message to the chat
function addMessageToChat(message, isSent) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isSent ? 'sent' : 'received');
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

// Send a message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', { text: message, sender: 'user' });
        addMessageToChat(message, true);
        messageInput.value = '';
    }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Socket.IO event listeners
socket.on('chat message', (msg) => {
    addMessageToChat(msg.text, msg.sender === 'user');
});

// Footer button functionality
function setActiveButton(button) {
    [textButton, voiceButton, videoButton].forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

textButton.addEventListener('click', () => {
    setActiveButton(textButton);
    endCall();
});

voiceButton.addEventListener('click', () => {
    setActiveButton(voiceButton);
    startCall(false);
});

videoButton.addEventListener('click', () => {
    setActiveButton(videoButton);
    startCall(true);
});

endCallButton.addEventListener('click', endCall);

// WebRTC functions
async function startCall(withVideo) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: withVideo
        });
        localVideo.srcObject = localStream;
        callContainer.classList.remove('hidden');
        isInitiator = true;
        createPeerConnection();
    } catch (error) {
        console.error('Error accessing media devices:', error);
    }
}

function createPeerConnection() {
    peer = new SimplePeer({
        initiator: isInitiator,
        stream: localStream,
        trickle: false
    });

    peer.on('signal', data => {
        socket.emit('signal', data);
    });

    peer.on('stream', stream => {
        remoteVideo.srcObject = stream;
    });

    socket.on('signal', data => {
        peer.signal(data);
    });
}

function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peer) {
        peer.destroy();
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    callContainer.classList.add('hidden');
}

// Notify when connected to the server
socket.on('connect', () => {
    addMessageToChat('Connected to the server', false);
});

// Handle incoming calls
socket.on('incoming call', ({ withVideo }) => {
    if (confirm('Incoming call. Accept?')) {
        startCall(withVideo);
    }
});
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

  // WebRTC signaling
  socket.on('offer', ({ offer, to }) => {
    socket.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to }) => {
    socket.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  // Text chat
  socket.on('message', ({ room, message }) => {
    socket.to(room).emit('message', { sender: socket.id, message });
  });

  // Audio stream started
  socket.on('audio-start', (roomName) => {
    socket.to(roomName).emit('user-audio-start', socket.id);
    console.log(`User ${socket.id} started audio in room ${roomName}`);
  });

  // Audio stream stopped
  socket.on('audio-stop', (roomName) => {
    socket.to(roomName).emit('user-audio-stop', socket.id);
    console.log(`User ${socket.id} stopped audio in room ${roomName}`);
  });

  // Audio volume change
  socket.on('audio-volume-change', ({ roomName, volume }) => {
    socket.to(roomName).emit('user-audio-volume-change', { userId: socket.id, volume });
  });

  // Mute/unmute
  socket.on('toggle-mute', ({ roomName, isMuted }) => {
    socket.to(roomName).emit('user-mute-change', { userId: socket.id, isMuted });
    console.log(`User ${socket.id} ${isMuted ? 'muted' : 'unmuted'} in room ${roomName}`);
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