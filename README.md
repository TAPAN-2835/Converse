<div align="center">
  <br />
    <h1 align="center">Converse - Real-Time Communication Platform</h1>
  <br />

  <p align="center">
    A production-grade, full-stack real-time chat and video calling application engineered for scale, speed, and seamless user experience.
  </p>
</div>

---

## 📖 Overview

**Converse** is a robust communication platform that provides instant messaging, rich media sharing, and real-time audio/video capabilities. Built with a modern micro-services inspired architecture, it leverages WebSockets for low-latency interactions and Stream's infrastructure for reliable enterprise-grade video calling. 

## ✨ Key Features

- **Real-Time Messaging**: Lightning-fast message delivery using Socket.io and Redis pub/sub.
- **Audio & Video Calls**: Integrated high-quality video conferencing via Stream SDK.
- **Group Chats & Channels**: Scalable group conversations with role-based access.
- **Media & File Attachments**: Optimized image handling using Cloudinary and Sharp.
- **Push Notifications**: Real-time alerts and email notifications powered by Resend.
- **Advanced State Management**: Efficient client-side caching and state synchronization using Zustand and TanStack Query.
- **Virtualized Lists**: High-performance rendering of extensive chat histories utilizing React-Window.
- **Secure Authentication**: Robust JWT-based authentication with HTTP-only cookies and bcrypt password hashing.

---

## 🛠️ Technology Stack

### **Frontend Architecture**
- **Core Framework**: React 19, React Router v7
- **Build Tool**: Vite 6
- **State Management**: Zustand, TanStack React Query v5
- **Real-time Client**: Socket.io-client, Stream Chat React, Stream Video React SDK
- **Styling**: Tailwind CSS, DaisyUI, PostCSS
- **Performance**: React Window, React Virtualized Auto Sizer (List Virtualization)
- **UI Components**: Lucide React (Icons), React Hot Toast (Notifications)
- **Network Requests**: Axios

### **Backend Architecture**
- **Runtime & Server**: Node.js, Express.js
- **Database (NoSQL)**: MongoDB with Mongoose ORM
- **In-Memory Cache & Pub/Sub**: Redis
- **Real-time Engine**: Socket.io, Stream Chat Node
- **Authentication & Security**: JSON Web Tokens (JWT), Bcrypt.js, Helmet, CORS
- **Media Processing & Storage**: Cloudinary (Storage), Multer (Uploads), Sharp (Image Optimization)
- **Transactional Emails**: Resend API
- **Environment & Utils**: Dotenv, Cookie Parser

---

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed and set up:
- **Node.js** (v18.0.0 or higher)
- **MongoDB** (Local instance or MongoDB Atlas)
- **Redis** Server
- Accounts for **Cloudinary**, **Resend**, and **Stream**

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/TAPAN-2835/Converse.git
   cd Converse
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   *Create a `.env` file in the `/backend` directory based on the variables listed below.*

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```
   *Create a `.env` file in the `/frontend` directory for client-side keys.*

### Environment Variables (.env)

**Backend (.env)**
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
REDIS_URL=your_redis_connection_url
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
RESEND_API_KEY=your_resend_api_key
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_STREAM_API_KEY=your_stream_api_key
```

### Running the Application Locally

You can run both environments concurrently using terminal tabs:

**Start the Backend Server (Port 5000):**
```bash
cd backend
npm run dev
```

**Start the Frontend Development Server (Port 5173):**
```bash
cd frontend
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 🏗️ System Architecture

### Authentication Flow
1. User authenticates via `/api/auth/login`.
2. Backend verifies credentials against MongoDB and signs a JWT.
3. JWT is stored in an `HttpOnly` cookie to prevent XSS attacks.
4. Subsequent requests are validated via an auth middleware.

### Real-Time Lifecycle
1. Upon successful login, the client establishes a persistent `Socket.io` connection.
2. The user's online presence is updated in Redis and broadcasted.
3. Chat messages are persisted to MongoDB and immediately emitted to the recipient's socket room.
4. Video streams are orchestrated via the Stream Video SDK utilizing WebRTC under the hood.

---

## 🔒 Security Measures
- **Helmet.js** for setting secure HTTP headers.
- **Bcrypt** for strong password hashing before database persistence.
- **CORS** configured strictly to allow specific frontend origins.
- **HttpOnly Cookies** ensuring tokens are inaccessible via client-side scripts.
- **Request Validation & Error Handling** to prevent injection and server crashes.

---

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.
