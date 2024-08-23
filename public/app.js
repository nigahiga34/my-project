const socket = io();

let username;
let localStream;
let peerConnection;
let remoteStream;
let isCaller = false;

document.getElementById('join').addEventListener('click', () => {
  username = document.getElementById('username').value;
  socket.emit('join', username);
});

document.getElementById('send').addEventListener('click', () => {
  const message = document.getElementById('message').value;
  socket.emit('message', message);
  document.getElementById('message').value = '';
});

document.getElementById('startCall').addEventListener('click', () => {
  startCall();
});

document.getElementById('hangup').addEventListener('click', () => {
  hangup();
});

socket.on('users', (users) => {
  const userList = document.getElementById('users');
  userList.innerHTML = '';
  users.forEach((user) => {
    const listItem = document.createElement('li');
    listItem.textContent = user;
    userList.appendChild(listItem);
  });
});

socket.on('message', (message) => {
  const messageList = document.getElementById('messages');
  const messageItem = document.createElement('li');
  messageItem.textContent = message;
  messageList.appendChild(messageItem);
});

socket.on('offer', (data) => {
  console.log('Received offer');
  if (!isCaller) {
    createAnswer(data);
  }
});

socket.on('answer', (data) => {
  console.log('Received answer');
  peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data }));
});

socket.on('candidate', (data) => {
  console.log('Received candidate');
  peerConnection.addIceCandidate(new RTCIceCandidate(data));
});

async function startCall() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });
    document.getElementById('localVideo').srcObject = localStream;

    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    localStream.get