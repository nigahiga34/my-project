// Connect to the Socket.IO server
const socket = io('http://localhost:3001');

// DOM elements
const messageContainer = document.getElementById('messageList');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const textButton = document.getElementById('textButton');
const voiceButton = document.getElementById('voiceButton');
const videoButton = document.getElementById('videoButton');

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

textButton.addEventListener('click', () => setActiveButton(textButton));
voiceButton.addEventListener('click', () => {
    setActiveButton(voiceButton);
    alert('Voice messaging is not implemented in this demo.');
});
videoButton.addEventListener('click', () => {
    setActiveButton(videoButton);
    alert('Video calling is not implemented in this demo.');
});

// Notify when connected to the server
socket.on('connect', () => {
    addMessageToChat('Connected to the server', false);
});