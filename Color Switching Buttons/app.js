const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Create an express app and HTTP server
const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Path to the JSON file
const jsonFilePath = path.join(__dirname, 'entities.json');

// Function to read entities from the JSON file
function readEntitiesFromFile() {
    const fileData = fs.readFileSync(jsonFilePath);
    return JSON.parse(fileData);
}

// Function to write entities back to the JSON file
function writeEntitiesToFile(entities) {
    fs.writeFileSync(jsonFilePath, JSON.stringify(entities, null, 2));
}

// Initial load of entities from the file
let state = readEntitiesFromFile();

app.use(express.static('public'));

// Listen for WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send initial state to the newly connected client
    ws.send(JSON.stringify({ type: 'initialData', data: state }));

    // Handle incoming messages
    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        // If it's a state change message
        if (parsedMessage.type === 'changeState') {
            const { id, state: newState } = parsedMessage;
            const entity = state.find(entity => entity.id === id);
            if (entity) {
                entity.state = newState; // Update state
                console.log(`Entity ${id} state changed to ${newState}`);

                // Update the JSON file with the new state
                writeEntitiesToFile(state);
                
                // Broadcast updated data to all clients
                broadcastUpdatedData();
            }
        }
    });

    // When a client disconnects
    ws.on('close', () => {
        console.log('Client disconnected');
    });

    // Broadcast the updated state to all clients
    function broadcastUpdatedData() {
        const data = {
            type: 'updateData',
            data: state
        };
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
});

// Start the server
const PORT = 3130;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
