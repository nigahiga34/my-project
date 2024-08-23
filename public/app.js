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