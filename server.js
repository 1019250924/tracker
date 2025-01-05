const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('A client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });


    ws.on('close', () => {
        console.log('A client disconnected');
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
