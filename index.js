import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins (localhost, vercel, mobile, etc.)
      callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log(`🔌 [Connected] Socket ID: ${socket.id} (Total Active: ${io.engine.clientsCount})`);

  socket.on("identity", async (userId) => {
    console.log(`👤 [Trigger: Identity] Socket: ${socket.id} -> User: ${userId}`);
    try {
      const baseUrl = process.env.NEXT_BASE_URL || "https://snapcart-d.vercel.app";
      if (userId && baseUrl) {
        await axios.post(
          `${baseUrl}/api/auth/socket/connect`,
          { userId, socketId: socket.id },
          { withCredentials: true }
        );
        console.log(`   ✅ Synced socketId ${socket.id} with User ${userId}`);
      }
    } catch (err) {
      console.error(`   ❌ Failed to sync user identity:`, err.message);
    }
  });

  socket.on("update-location", async ({ userId, latitude, longitude }) => {
    console.log(`📍 [Trigger: Location Update] User: ${userId} | Lat: ${latitude?.toFixed?.(5) ?? latitude}, Lng: ${longitude?.toFixed?.(5) ?? longitude}`);
    try {
      io.emit("update-location", { userId, latitude, longitude });

      const location = {
        type: "Point",
        coordinates: [longitude, latitude],
      };

      const baseUrl = process.env.NEXT_BASE_URL || "https://snapcart-d.vercel.app";
      if (baseUrl) {
        await axios
          .post(
            `${baseUrl}/api/auth/socket/update-location`,
            { userId, location },
            { withCredentials: true }
          )
          .catch((err) => {
            console.error(`   ❌ Failed to persist location to backend:`, err.message);
          });
      }
    } catch (err) {
      console.error(`   ❌ Location update error:`, err.message);
    }
  });

  socket.on("join-room", (roomId) => {
    if (roomId) {
      socket.join(roomId);
      console.log(`🚪 [Trigger: Join Room] Socket ${socket.id} joined Room: ${roomId}`);
    }
  });

  socket.on("send-message", (data) => {
    console.log(`💬 [Trigger: Send Message] Room: ${data?.roomId || "Broadcast"} | Sender: ${data?.senderId || "Unknown"}`);
    if (data?.roomId) {
      socket.to(data.roomId).emit("receive-message", data);
    } else if (data) {
      socket.broadcast.emit("receive-message", data);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ [Disconnected] Socket ID: ${socket.id} (Reason: ${reason})`);
  });
});

app.post("/notify", (req, res) => {
  try {
    const { event, data, socketId } = req.body;
    if (!event) {
      console.log(`⚠️ [/notify] Rejected: Missing event name`);
      return res.status(400).json({ success: false, message: "Event name is required" });
    }

    if (socketId) {
      console.log(`🔔 [Trigger: HTTP Notify] Event: '${event}' -> Targeted Socket: ${socketId}`);
      io.to(socketId).emit(event, data);
    } else {
      console.log(`📢 [Trigger: HTTP Notify] Event: '${event}' -> Broadcast to ALL`);
      io.emit(event, data);
    }
    return res.status(200).json({ success: true, message: "Notification sent successfully" });
  } catch (err) {
    console.error(`❌ [/notify Error]:`, err.message);
    return res.status(500).json({ success: false, message: "Failed to send notification" });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "ok", activeSockets: io.engine.clientsCount });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 [Socket Server] Listening on port ${PORT}`);
  console.log(`🌐 [CORS Origin] Allowed: All origins (localhost & Vercel)`);
});