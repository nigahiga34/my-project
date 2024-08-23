document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); 
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const videoCallButton = document.getElementById('videoCallButton');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const videoContainer = document.getElementById('videoContainer');

    sendButton.addEventListener('click', () => {
        const messageText = messageInput.value.trim();
        if (messageText !== '') {
            socket.emit('sendMessage', messageText); 
            messageInput.value = '';
        }
    });

    socket.on('message', (message) => {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; 
    });

    let localStream;
    let remoteStream;
    let peerConnection;

    const servers = {
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302'
            }
        ]
    };

    videoCallButton.addEventListener('click', async () => {
        videoContainer.style.display = 'flex'; 
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        peerConnection = new RTCPeerConnection(servers);

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            remoteVideo.srcObject = remoteStream;
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate);
            }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
    });

    socket.on('offer', async (offer) => {
        peerConnection = new RTCPeerConnection(servers);
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            remoteVideo.srcObject = remoteStream;
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate);
            }
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    });

    socket.on('answer', async (answer) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('candidate', async (candidate) => {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });
});
