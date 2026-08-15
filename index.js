import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_BASE_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("identity", async (userId) => {
    try {
      if (userId && process.env.NEXT_BASE_URL) {
        await axios.post(
          `${process.env.NEXT_BASE_URL}/api/auth/socket/connect`,
          { userId, socketId: socket.id },
          { withCredentials: true }
        );
      }
    } catch {
      // Ignored
    }
  });

  socket.on("update-location", async ({ userId, latitude, longitude }) => {
    try {
      io.emit("update-location", { userId, latitude, longitude });

      const location = {
        type: "Point",
        coordinates: [longitude, latitude],
      };

      if (process.env.NEXT_BASE_URL) {
        await axios
          .post(
            `${process.env.NEXT_BASE_URL}/api/auth/socket/update-location`,
            { userId, location },
            { withCredentials: true }
          )
          .catch(() => {});
      }
    } catch {
      // Ignored
    }
  });

  socket.on("join-room", (roomId) => {
    if (roomId) {
      socket.join(roomId);
    }
  });

  socket.on("send-message", (data) => {
    if (data?.roomId) {
      socket.to(data.roomId).emit("receive-message", data);
    } else if (data) {
      socket.broadcast.emit("receive-message", data);
    }
  });
});

app.post("/notify", (req, res) => {
  try {
    const { event, data, socketId } = req.body;
    if (!event) {
      return res.status(400).json({ success: false, message: "Event name is required" });
    }
    if (socketId) {
      io.to(socketId).emit(event, data);
    } else {
      io.emit(event, data);
    }
    return res.status(200).json({ success: true, message: "Notification sent successfully" });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to send notification" });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
});