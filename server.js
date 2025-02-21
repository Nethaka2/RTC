const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

const users = {};

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'register':
                    if (!data.userId || typeof data.userId !== 'string') {
                        ws.send(JSON.stringify({ error: "Invalid user ID" }));
                        return;
                    }
                    users[data.userId] = ws;
                    ws.userId = data.userId;
                    console.log(`User ${data.userId} registered. Current users:`, Object.keys(users));

                    ws.send(JSON.stringify({ type: 'registered', userId: data.userId }));

                    // Send updated user list
                    const userList = Object.keys(users);
                    Object.values(users).forEach(user => {
                        user.send(JSON.stringify({ type: 'array', arr: userList }));
                    });
                    break;

                case 'call':
                    if (!users[data.targetId]) {
                        console.error(`User ${data.targetId} not found. Available users:`, Object.keys(users));
                        ws.send(JSON.stringify({ error: "User not found" }));
                        return;
                    }
                    users[data.targetId].send(JSON.stringify({
                        type: 'incoming_call',
                        from: data.userId
                    }));
                    break;

                case 'offer':
                case 'answer':
                case 'candidate':
                    if (users[data.targetId]) {
                        users[data.targetId].send(JSON.stringify(data));
                    } else {
                        ws.send(JSON.stringify({ error: "User not found" }));
                    }
                    break;

                default:
                    ws.send(JSON.stringify({ error: "Unknown message type" }));
            }
        } catch (error) {
            console.error("Error processing message:", error);
            ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
    });

     ws.on('close', () => {
        if (ws.userId) {
            delete users[ws.userId];
            console.log(`User ${ws.userId} disconnected.`);

            // Update user list for all connected clients
            const userList = Object.keys(users);
            Object.values(users).forEach(user => {
                user.send(JSON.stringify({ type: 'array', arr: userList }));
            });
        }
    });
});

console.log('WebSocket signaling server running on ws://localhost:3000');

