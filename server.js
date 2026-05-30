const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Keep track of rooms and active connections
const rooms = new Map(); // roomCode -> Set of WebSocket clients

wss.on('connection', (ws) => {
  let currentRoom = null;
  let playerDetails = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type, roomCode, payload } = data;

      if (!roomCode) return;
      const roomKey = roomCode.toUpperCase();

      if (type === 'PLAYER_JOIN') {
        currentRoom = roomKey;
        playerDetails = payload;

        if (!rooms.has(roomKey)) {
          rooms.set(roomKey, new Set());
        }
        rooms.get(roomKey).add(ws);

        // Broadcast to everyone in the room (except self)
        broadcastToRoom(roomKey, ws, data);
        return;
      }

      // Forward all other messages (stats, transactions, chat, heartbeats) to everyone in the room
      broadcastToRoom(roomKey, ws, data);

    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const roomSet = rooms.get(currentRoom);
      roomSet.delete(ws);
      if (roomSet.size === 0) {
        rooms.delete(currentRoom);
      } else {
        // Broadcast leave event
        if (playerDetails) {
          const leaveMsg = {
            type: 'CHAT_MSG',
            roomCode: currentRoom,
            payload: {
              sender: 'SYSTEM',
              text: `⚠️ Captain ${playerDetails.name} lost connection to the competitive grid.`,
              color: '#ff3333'
            }
          };
          roomSet.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(leaveMsg));
            }
          });

          // Also trigger a stats update by removing this player from others' lists
          const removeMsg = {
            type: 'PLAYER_LEAVE',
            roomCode: currentRoom,
            payload: {
              id: playerDetails.id,
              name: playerDetails.name
            }
          };
          roomSet.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(removeMsg));
            }
          });
        }
      }
    }
  });
});

function broadcastToRoom(roomKey, senderWs, msgData) {
  if (!rooms.has(roomKey)) return;
  rooms.get(roomKey).forEach((client) => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msgData));
    }
  });
}

// Fallback to index.html for React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Void Horizon game server running on port ${PORT}`);
});
