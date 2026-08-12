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
        credentials:true
    }
});
io.on('connection', (socket) => {
    console.log('A user connected', socket.id);
    socket.on("identity",async(userId)=>{
        console.log(userId)
        await axios.post(`${process.env.NEXT_BASE_URL}/api/auth/socket/connect`,{
            userId,
            socketId:socket.id
        },{withCredentials:true})
    })

    socket.on("update-location", async ({ userId, latitude, longitude }) => {
        try {
            console.log(`📍 [Socket] Live location broadcast for user ${userId}:`, latitude, longitude);
            io.emit("update-location", { userId, latitude, longitude });

            const location = {
                type: "Point",
                coordinates: [longitude, latitude],
            };
            if (process.env.NEXT_BASE_URL) {
                await axios.post(`${process.env.NEXT_BASE_URL}/api/auth/socket/update-location`, {
                    userId,
                    location
                }, { withCredentials: true }).catch(() => {});
            }
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected', socket.id);
    });
})

app.post("/notify", (req, res) => {
    const { event, data, socketId } = req.body;
    if (socketId) {
        io.to(socketId).emit(event, data);
    } else {
        io.emit(event, data);
    }
    return res.status(200).json({ success: true, message: "Notification sent" });
});

server.listen(process.env.PORT || 4000, () => {
    console.log('Server is running on port', process.env.PORT || 4000);
});