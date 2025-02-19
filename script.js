
const signalingServer = new WebSocket('ws://localhost:3000');
let localStream;
let peerConnection;
const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

document.addEventListener('DOMContentLoaded', () => {
    const userIdInput = document.getElementById('userId');
    const targetIdInput = document.getElementById('targetId');
    const registerBtn = document.getElementById('register');
    const callBtn = document.getElementById('call');
    const state = document.getElementById('state');
    const urID = document.getElementById('usrID');
    
    registerBtn.addEventListener('click', () => {
        register(userIdInput.value);
        state.textContent = "Registered";
        userIdInput.style.display = 'none';
        registerBtn.style.display = 'none';
        urID.textContent = `Your ID is: ${userIdInput.value}`;

    });

    callBtn.addEventListener('click', () => {
        callUser(targetIdInput.value);
    });
});

function register(userId) {
    signalingServer.send(JSON.stringify({ type: 'register', userId }));
}

function callUser(targetId) {
    peerConnection = new RTCPeerConnection(servers);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            signalingServer.send(JSON.stringify({
                type: 'candidate',
                targetId,
                candidate: event.candidate
            }));
        }
    };
    peerConnection.createOffer().then(offer => {
        peerConnection.setLocalDescription(offer);
        signalingServer.send(JSON.stringify({ type: 'offer', targetId, offer }));
    });
}

signalingServer.onmessage = async (message) => {
    const data = JSON.parse(message.data);
    switch (data.type) {
        case 'incoming_call':
            acceptCall(data.from);
            break;
        case 'offer':
            peerConnection = new RTCPeerConnection(servers);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    signalingServer.send(JSON.stringify({
                        type: 'candidate',
                        targetId: data.userId,
                        candidate: event.candidate
                    }));
                }
            };
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            peerConnection.createAnswer().then(answer => {
                peerConnection.setLocalDescription(answer);
                signalingServer.send(JSON.stringify({ type: 'answer', targetId: data.userId, answer }));
            });
            break;
        case 'answer':
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            break;
        case 'candidate':
            peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            break;
        case 'array':
            const urArray = document.getElementById('userArray');
            urArray.textContent = data.arr;
            console.log(data.arr);
    }
};

async function startCall() {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    document.getElementById('startCall').disabled = true;
}

document.getElementById('startCall').addEventListener('click', startCall);
