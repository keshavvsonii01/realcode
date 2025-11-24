const express = require('express');
const next = require('next');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Y = require('yjs');
const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store Yjs documents per room
const docs = new Map();
const getYDoc = (roomId) => {
  if (!docs.has(roomId)) {
    const doc = new Y.Doc();
    docs.set(roomId, doc);
  }
  return docs.get(roomId);
};

// MongoDB Schema
const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  content: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  lastUpdated: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', RoomSchema);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/codesync', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB Connected');
}).catch(err => {
  console.log('⚠️  MongoDB Connection Error:', err.message);
});

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store active users per room
  const rooms = new Map();

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Handle room join
    socket.on('join-room', async ({ roomId, user }) => {
      socket.join(roomId);
      
      // Initialize room if not exists
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      // Add user to room
      rooms.get(roomId).set(socket.id, {
        id: socket.id,
        name: user.name,
        color: user.color
      });

      // Broadcast updated user list
      const usersInRoom = Array.from(rooms.get(roomId).values());
      io.to(roomId).emit('users-update', usersInRoom);

      console.log(`👤 ${user.name} joined room: ${roomId}`);

      // Load room from DB
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          socket.emit('room-data', {
            content: room.content,
            language: room.language
          });
        }
      } catch (err) {
        console.error('Error loading room:', err);
      }
    });

    // Handle Yjs sync messages
    socket.on('yjs-sync', ({ roomId, update }) => {
      const ydoc = getYDoc(roomId);
      const uint8Array = new Uint8Array(update);
      Y.applyUpdate(ydoc, uint8Array);
      
      // Broadcast to all other clients in the room
      socket.to(roomId).emit('yjs-sync', { update });
    });

    // Handle Yjs awareness updates
    socket.on('yjs-awareness', ({ roomId, update }) => {
      // Broadcast awareness to all other clients
      socket.to(roomId).emit('yjs-awareness', { update });
    });

    // Handle cursor position updates
    socket.on('cursor-position', ({ roomId, position, user }) => {
      socket.to(roomId).emit('remote-cursor', {
        userId: socket.id,
        position,
        user
      });
    });

    // Handle code save
    socket.on('save-code', async ({ roomId, content, language }) => {
      try {
        await Room.findOneAndUpdate(
          { roomId },
          { 
            content, 
            language, 
            lastUpdated: new Date() 
          },
          { upsert: true, new: true }
        );
        console.log(`💾 Saved code for room: ${roomId}`);
      } catch (err) {
        console.error('Error saving code:', err);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
      
      // Remove user from all rooms
      rooms.forEach((roomUsers, roomId) => {
        if (roomUsers.has(socket.id)) {
          roomUsers.delete(socket.id);
          
          // Broadcast updated user list
          const usersInRoom = Array.from(roomUsers.values());
          io.to(roomId).emit('users-update', usersInRoom);
        }
      });
    });
  });

  // Auto-save interval (every 30 seconds)
  setInterval(async () => {
    // This would be triggered by client-side content changes
    console.log('⏰ Auto-save check...');
  }, 30000);

  // Handle all Next.js routes
  expressApp.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log(`🎨 CodeSync Collaborative Editor`);
  });
});