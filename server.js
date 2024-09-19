// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import userRoutes from "./Routes/userRoutes.js"; // Routes
import { initializeSocket } from './socket.js'; // Import socket logic

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use('/', userRoutes);
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect("mongodb+srv://Vishal123:Vishal123@cluster0.hwzrbs5.mongodb.net/mern-chat-app?retryWrites=true&w=majority&appName=Cluster0");

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => console.log("Connected to DB"));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Start the server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
