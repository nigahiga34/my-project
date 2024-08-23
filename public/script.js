const socket = io();

document.getElementById('send-btn').addEventListener('click', () => {
    const message = document.getElementById('message').value;
    if (message) {
        socket.emit('chat message', message);
        document.getElementById('message').value = '';
    }
});

socket.on('chat message', (msg) => {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.textContent = msg;
    document.querySelector('.messages').appendChild(messageElement);
});
