<div align="center">

# ⚡ SnapCart Socket Server

### Real-Time Event Relay Microservice

[![Live](https://img.shields.io/badge/🌐_Live-socketserver--snapcart.onrender.com-blueviolet?style=for-the-badge)](https://socketserver-snapcart.onrender.com)
[![SnapCart App](https://img.shields.io/badge/🛒_SnapCart-snapcart--d.vercel.app-emerald?style=for-the-badge)](https://snapcart-d.vercel.app)

[![Express](https://img.shields.io/badge/Express_5-000000?style=flat-square&logo=express)](https://expressjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO_4-010101?style=flat-square&logo=socket.io)](https://socket.io)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

---

A lightweight **Express + Socket.IO** microservice that powers all real-time communication in the [SnapCart](https://snapcart-d.vercel.app) grocery delivery platform — including live order notifications, GPS location broadcasting, and in-app delivery chat.

</div>

---

## 🎯 Purpose

Next.js serverless API routes on Vercel cannot maintain persistent WebSocket connections. This dedicated Socket Server acts as the **real-time event relay layer** between:

- **Customers** tracking their delivery in real-time
- **Admins** receiving live order notifications
- **Delivery Partners** broadcasting GPS location and chatting with customers

The Next.js server communicates with this service via HTTP `POST /notify` requests, which are then relayed as WebSocket events to connected clients.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSERS                           │
│                                                              │
│  Customer          Admin            Delivery Partner          │
│  (track order,     (new order       (share GPS,              │
│   chat)             alerts)          accept assignments)     │
│      │                │                    │                  │
│      └────────────────┼────────────────────┘                  │
│                       │                                       │
│               Socket.IO Client                                │
│        (WebSocket + Polling Fallback)                         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│              THIS SOCKET SERVER (Render)                      │
│                                                               │
│  ┌─────────────────────────────────┐                          │
│  │     Socket.IO Event Handlers    │                          │
│  │                                 │                          │
│  │  "identity"                     │  → Syncs user's socketId │
│  │  "update-location"              │  → Broadcasts GPS coords │
│  │  "join-room"                    │  → Joins chat room       │
│  │  "send-message"                 │  → Relays to chat room   │
│  │  "disconnect"                   │  → Cleanup               │
│  └─────────────────────────────────┘                          │
│                                                               │
│  ┌─────────────────────────────────┐                          │
│  │     HTTP REST Endpoints         │                          │
│  │                                 │                          │
│  │  POST /notify                   │  → Emit event to socket  │
│  │       { event, data, socketId } │    or broadcast to all   │
│  │                                 │                          │
│  │  GET /                          │  → Health check +        │
│  │       { status, activeSockets } │    active connection cnt │
│  └─────────────────────────────────┘                          │
└────────────────────────┬──────────────────────────────────────┘
                         │ HTTP callbacks
                         ▼
┌────────────────────────────────────────────────────────────────┐
│              NEXT.JS SERVER (Vercel)                           │
│                                                                │
│  /api/auth/socket/connect        ← Persist socketId to DB     │
│  /api/auth/socket/update-location ← Persist GeoJSON to DB    │
│                                                                │
│  emitEventHandler.ts → POST /notify to this server            │
│  (called from order creation, status updates, assignments)    │
└────────────────────────────────────────────────────────────────┘
```

---

## 📡 Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `identity` | `userId: string` | Associates the socket connection with a MongoDB user ID. The server calls the Next.js API to persist the `socketId` to the user document. |
| `update-location` | `{ userId, latitude, longitude }` | Delivery partner's GPS coordinates. Broadcast to all clients and persisted via Next.js API. |
| `join-room` | `roomId: string` | Joins a chat room (for customer ↔ delivery partner messaging). |
| `send-message` | `{ roomId, senderId, text, time }` | Sends a chat message. Relayed to all other members of the room. |

### Server → Client

| Event | Source | Description |
|-------|--------|-------------|
| `update-location` | Broadcast | Delivery partner GPS coordinates for live map tracking. |
| `receive-message` | Room relay | Incoming chat message from the other party. |
| `new-order` | HTTP `/notify` | New order placed — triggers admin order list update. |
| `order-status-update` | HTTP `/notify` | Order status changed — updates customer tracking & admin views. |
| `delivery-assignment` | HTTP `/notify` | New delivery assignment broadcasted to nearby delivery partners. |

---

## 🔌 HTTP API

### `POST /notify`

Emit a socket event from the Next.js server to connected clients.

```json
// Request body
{
  "event": "new-order",           // Required: event name
  "data": { ... },                // Required: event payload
  "socketId": "abc123"            // Optional: target specific socket (omit for broadcast)
}

// Response
{ "success": true, "message": "Notification sent successfully" }
```

**Used by Next.js API routes:**
- Order placement → `new-order` (broadcast)
- Status update → `order-status-update` (broadcast)
- Delivery assignment → `delivery-assignment` (targeted to delivery partner's socketId)

### `GET /`

Health check endpoint.

```json
// Response
{ "status": "ok", "activeSockets": 12 }
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/akashsingh062/socketserver-snapcart.git
cd socketserver-snapcart

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Start the development server
npm run dev
```

The server starts on `http://localhost:4000` by default.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `NEXT_BASE_URL` | `https://snapcart-d.vercel.app` | SnapCart Next.js app URL (for identity sync & location persistence callbacks) |

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js (ES Modules) | JavaScript runtime |
| **HTTP Server** | Express 5 | REST endpoints + middleware |
| **WebSockets** | Socket.IO 4 | Bidirectional real-time communication |
| **HTTP Client** | Axios | Callbacks to Next.js API |
| **CORS** | cors | Cross-origin request handling |
| **Environment** | dotenv | Environment variable loading |
| **Dev Tools** | nodemon | Auto-restart on file changes |

---

## 📦 Deployment (Render)

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Environment:** Set `NEXT_BASE_URL` to your Vercel app URL
4. Update `NEXT_PUBLIC_SOCKET_SERVER` in your SnapCart Vercel environment to point to the Render URL

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Part of the [SnapCart](https://snapcart-d.vercel.app) ecosystem — Built with ❤️ by [Akash Singh](https://github.com/akashsingh062)**

</div>
