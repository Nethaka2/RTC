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
    });

    callBtn.addEventListener('click', async () => {
        if (!localStream) {
            await startCall();
        }
        callUser(targetIdInput.value);
    });
});

function register(userId) {
    if (!userId) {
        alert("User ID cannot be empty");
        return;
    }
    signalingServer.send(JSON.stringify({ type: 'register', userId }));
}

function callUser(targetId) {
    if (!targetId) {
        alert("Target ID cannot be empty");
        return;
    }
    
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

    peerConnection.ontrack = event => {
        playRemoteAudio(event.streams[0]);
    };

    peerConnection.createOffer()
        .then(offer => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            signalingServer.send(JSON.stringify({ type: 'offer', targetId, offer: peerConnection.localDescription }));
        })
        .catch(console.error);
}

signalingServer.onmessage = async (message) => {
    try {
        const data = JSON.parse(message.data);
        switch (data.type) {
            case 'incoming_call':
                if (!localStream) await startCall();
                acceptCall(data.from);
                break;
            case 'offer':
                if (!peerConnection) peerConnection = new RTCPeerConnection(servers);
                
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

                peerConnection.ontrack = event => {
                    console.log(event);
                    if (event.streams && event.streams[0]) {
                        playRemoteAudio(event.streams[0]);
                    }
                };

                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                signalingServer.send(JSON.stringify({ type: 'answer', targetId: data.userId, answer }));
                break;
            case 'answer':
                if (peerConnection) {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
                break;
            case 'candidate':
                if (peerConnection) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
                break;
            case 'array':
                document.getElementById('userArray').textContent = data.arr.join(', ');
                break;
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
};

async function startCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        document.getElementById('startCall').disabled = true;
    } catch (error) {
        console.error("Error accessing media devices:", error);
    }
}

document.getElementById('startCall').addEventListener('click', startCall);

function playRemoteAudio(stream) {
    let audioElement = document.getElementById('remoteAudio');
    if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.id = 'remoteAudio';
        audioElement.autoplay = true;
        audioElement.controls = true; // Ensure audio playback controls are available
        document.body.appendChild(audioElement);
    }
    audioElement.srcObject = stream;
    audioElement.play().catch(error => console.error("Error playing audio:", error));
}

