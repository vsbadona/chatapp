import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import cors from "cors"
import userRoutes from "./Routes/userRoutes.js"
import { Server } from "socket.io"
import http from "http"
import Message from "./Schema/messageSchema.js";
import Conversation from "./Schema/conversationSchema.js";
import dotenv from "dotenv"


const app = express();
dotenv.config();

app.use(cors({
  origin: "*",
  credentials:true
}))

app.use(express.json())

app.use('/',userRoutes)
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect('mongodb+srv://Vishal123:Vishal123@cluster0.hwzrbs5.mongodb.net/mern-chat-app?retryWrites=true&w=majority&appName=Cluster0');
const db = mongoose.connection;
db.on('error',(err)=>console.log("I have abn error",err))
db.once('open',()=>console.log("Connected to Db"))


const server = http.createServer(app);
const io = new Server(server,{
  cors:{
      origin:'*',
      credentials:true
  }
});

io.on("connection", (socket) => {
  console.log("New client connected");

  // Join conversation room
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`Client joined conversation: ${conversationId}`);
  });
  socket.on('sendMessage', async ({ text, userId, conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        const newMessage = {
          text: text,
          user: userId,
          conversation: conversationId
        };
        conversation.messages.push(newMessage);
        await conversation.save();

        // Emit to all clients in the conversation room
        io.to(conversationId).emit('newMessage', newMessage);
      }
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});


app.use((req, res, next) => {
  req.io = io;  // Attach io to the request object
  next();
});
const PORT = process.env.PORT || 5000;
server.listen(PORT,()=>{
    console.log("Server is listening to PORT:",PORT);
})

