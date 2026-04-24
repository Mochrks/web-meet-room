/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3001;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory room registry: roomId -> Map<socketId, userData>
const rooms = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    let currentRoom = null;

    socket.on("join-room", ({ roomId, user }) => {
      currentRoom = roomId;
      socket.join(roomId);

      // Track user in room registry
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      const room = rooms.get(roomId);
      room.set(socket.id, user);

      // Send existing participants to the new joiner
      const existingUsers = [];
      room.forEach((u, sid) => {
        if (sid !== socket.id) {
          existingUsers.push({ socketId: sid, user: u });
        }
      });
      socket.emit("room-users", existingUsers);

      // Tell everyone else about the new user
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        user,
      });

      console.log(`[Room ${roomId}] ${user.name} joined (${room.size} users)`);
    });

    // ── WebRTC signaling ──────────────────────────────────────────────
    socket.on("signal", ({ to, signal }) => {
      io.to(to).emit("signal", { from: socket.id, signal });
    });

    // ── Media status broadcast ────────────────────────────────────────
    socket.on("media-state", (state) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room && room.has(socket.id)) {
        const user = room.get(socket.id);
        room.set(socket.id, { ...user, ...state });
      }
      socket.to(currentRoom).emit("media-state", {
        socketId: socket.id,
        ...state,
      });
    });

    // ── Chat ──────────────────────────────────────────────────────────
    socket.on("chat-message", (msg) => {
      if (!currentRoom) return;
      io.to(currentRoom).emit("chat-message", msg);
    });
	
    // ── Explicit Leave ────────────────────────────────────────────────
    socket.on("leave-room", () => {
      if (currentRoom && rooms.has(currentRoom)) {
        console.log(`[Room ${currentRoom}] ${socket.id} left room explicitly`);
        const room = rooms.get(currentRoom);
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(currentRoom);
        }
        socket.to(currentRoom).emit("user-left", socket.id);
        socket.leave(currentRoom);
        currentRoom = null;
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      if (currentRoom && rooms.has(currentRoom)) {
        const room = rooms.get(currentRoom);
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(currentRoom);
        }
        socket.to(currentRoom).emit("user-left", socket.id);
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});
