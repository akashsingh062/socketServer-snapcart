<div align="center">

# ⚡ SnapCart — Real-Time WebSocket Microservice

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.x-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![CORS](https://img.shields.io/badge/CORS-Configured-orange?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

The dedicated, ultra-low latency real-time communication server powering **SnapCart**'s live GPS delivery tracking, buyer-driver chat messaging, and instantaneous event push notifications.

[Features](#-key-features) • [Architecture](#-how-it-works) • [Event Reference](#-websocket-event-reference) • [HTTP API](#-http-webhook-api) • [Getting Started](#-getting-started)

</div>

---

## ⚡ Key Features

- **📍 High-Frequency Live GPS Location Streaming**: Relays real-time latitude/longitude coordinates between delivery riders and customer live maps.
- **💬 Direct Buyer-Driver Chat Rooms**: Supports dynamic room-based message routing (`join-room`, `send-message`, `receive-message`).
- **🔔 HTTP `/notify` Webhook Endpoint**: Allows the Next.js API server to push real-time events (order placed, driver assigned, order status changed) to connected clients without keeping socket instances on serverless functions.
- **🔗 Client Identity & Session Sync**: Associates incoming socket IDs with authenticated user IDs on the Next.js backend.
- **🛡️ Secure CORS & Credentials**: Built-in credentialed CORS support configured for Next.js web clients.

---

## 🏛 How It Works

```mermaid
sequenceDiagram
    autonumber
    actor Customer as 👤 Customer
    actor Rider as 🛵 Delivery Rider
    participant Socket as ⚡ Socket Server (:4000)
    participant NextApp as 🌐 Next.js Backend (:3000)

    Note over Customer,Socket: 1. Identity & Connect
    Customer->>Socket: connect + emit("identity", userId)
    Socket->>NextApp: POST /api/auth/socket/connect (bind socketId)

    Note over Rider,Socket: 2. Real-time Location Updates
    Rider->>Socket: emit("update-location", { userId, latitude, longitude })
    Socket->>NextApp: POST /api/auth/socket/update-location (persist to DB)
    Socket-->>Customer: broadcast("update-location", { userId, latitude, longitude })

    Note over Customer,Rider: 3. Instant Chat Messaging
    Customer->>Socket: emit("join-room", roomId)
    Rider->>Socket: emit("join-room", roomId)
    Customer->>Socket: emit("send-message", { roomId, message, senderId })
    Socket-->>Rider: emit("receive-message", data)

    Note over NextApp,Customer: 4. Server-Triggered Notifications
    NextApp->>Socket: POST /notify { event: "order-status-update", data, socketId }
    Socket-->>Customer: emit("order-status-update", data)
```

---

## 📡 WebSocket Event Reference

### Client-to-Server (`socket.on`)

| Event | Payload | Description |
|---|---|---|
| `identity` | `userId: string` | Registers the socket with the user's account and updates the backend. |
| `update-location` | `{ userId: string, latitude: number, longitude: number }` | Emits live GPS coordinates to tracking maps and updates MongoDB geospatial coordinates. |
| `join-room` | `roomId: string` | Subscribes the socket connection to a dedicated chat room. |
| `send-message` | `{ roomId: string, ...messageData }` | Relays an in-app message to room participants or broadcasts to listeners. |

### Server-to-Client (`socket.emit` / `io.emit`)

| Event | Payload | Target | Description |
|---|---|---|---|
| `update-location` | `{ userId, latitude, longitude }` | All clients | Streams live agent location to map views. |
| `receive-message` | `MessageObject` | Room members | Delivers new chat messages in real time. |
| `new-order` | `OrderObject` | Admins | Notifies admins when a new order is submitted. |
| `new-assignment` | `AssignmentObject` | Delivery Boys | Broadcasts proximity delivery requests to active riders. |
| `order-status-update` | `{ orderId, status, isPaid }` | Specific / All | Updates order progress badge across portals. |

---

## 🔌 HTTP Webhook API

### `POST /notify`
Enables Next.js server actions and API routes to emit socket events across the network.

**Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "event": "order-status-update",
  "data": {
    "orderId": "65b1c2d3...",
    "status": "out_for_delivery"
  },
  "socketId": "optional_target_socket_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification sent successfully"
}
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ or v20+
- **npm** or **yarn**

### 2. Installation
```bash
cd socketServer
npm install
```

### 3. Environment Variables
Create a `.env` file in the `socketServer` directory:

```env
PORT=4000
NEXT_BASE_URL=http://localhost:3000
```

### 4. Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
node index.js
```

---

## 👨‍💻 Author

Part of the **[SnapCart Ecosystem](https://github.com/akashsingh062/snapcart)** by **[Akash Singh](https://github.com/akashsingh062)**.
