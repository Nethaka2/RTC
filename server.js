
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

const users = {}; 

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        switch (data.type) {
            case 'register':
                users[data.userId] = ws;
                ws.userId = data.userId;
                users[data.userId].send(JSON.stringify({
                    type: 'array',
                    arr: users
                }))
                console.log(`User ${data.userId} registered.`);
                break;
            case 'call':
                if (users[data.targetId]) {
                    users[data.targetId].send(JSON.stringify({
                        type: 'incoming_call',
                        from: data.userId
                    }));
                }
                break;
            case 'offer':
            case 'answer':
            case 'candidate':
                if (users[data.targetId]) {
                    users[data.targetId].send(JSON.stringify(data));
                }
                break;
        }
    });
    
    ws.on('close', () => {
        if (ws.userId) {
            delete users[ws.userId];
            console.log(`User ${ws.userId} disconnected.`);
        }
    });
});

console.log('WebSocket signaling server running on ws://localhost:3000');

