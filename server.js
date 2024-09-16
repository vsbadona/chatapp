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
import User from "./Schema/userSchema.js";


const app = express();
const ObjectId = mongoose.Types.ObjectId;
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
const io = new Server(server, {
  cors: {
    origin: '*',  // Adjust CORS as needed
    methods: ['GET', 'POST'],
    credentials:true,
  }
});

io.on("connection", (socket) => {
  console.log("New client connected");

  // Join conversation room
 // Send a new message in a conversation
socket.on('sendMessage', async ({ text, userId, conversationId, status }) => {
  try {
    const conversation = await Conversation.findById(conversationId);
    
    if (conversation) {
      // Create a new message
      const newMessage = new Message({
        text,
        sender: userId,
        status,
        conversation: conversationId
      });

      // Save the message
      await newMessage.save();

      // Push the message to the conversation
      conversation.messages.push(newMessage._id);
      await conversation.save();

      // Populate message with sender details before emitting
      const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username image');

      io.to(conversationId).emit('newMessage', populatedMessage);
    }
  } catch (error) {
    console.error("Error sending message: ", error);
    socket.emit('alert', { message: 'Error sending message' });
  }
});


  socket.on('searchUser',async({query,userId}) => {
    const users = await User.find({ username: new RegExp(query, 'i') });
    io.emit('searched', users);
  })
 // Fetch all messages in a conversation
socket.on('fetchat', async ({ conversationId }) => {
  try {
    const conversation = await Conversation.findById(conversationId)
      .populate({
        path: 'messages',
        populate: { path: 'sender', select: 'username image' }  // Populate sender info
      });

    if (conversation) {
      socket.emit('allChat', { success: conversation.messages });
    } else {
      socket.emit('alert', { message: "Conversation Not Found" });
    }
  } catch (error) {
    console.error("Error fetching conversation:", error);
    socket.emit('alert', { message: "Server Error" });
  }
});



 // Update the status of a specific message
 socket.on('updateMessageStatus', async ({ messageId, userId, conversationId, status }) => {
  try {
    // Find the conversation by ID
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return socket.emit('alert', { message: 'Invalid Conversation' });
    }

    // Find the specific message to update
    const message = await Message.findById(messageId);

    if (!message) {
      return socket.emit('alert', { message: 'Message Not Found' });
    }

    // Ensure the message belongs to the user
    if (String(message.sender) == userId) {
      return socket.emit('alert', { message: "You don't have permission to update this message" });
    }

    // Update the status of the specific message
    message.status = status;
    await message.save();

    // Find all previous messages in the same conversation with status 'delivered'
    const allMessages = await Message.find({ conversation: conversationId });

    // Update the status of messages with 'delivered' status to 'read'
    for (let msg of allMessages) {
      if (msg.status === 'delivered') {
        msg.status = 'read';
        await msg.save(); // Save each message after updating
      }
    }

    // Emit the success event with the updated message
    socket.emit('successMessage', { message });

    // Notify all participants in the conversation that message statuses have been updated
    io.to(conversationId).emit('messageStatusUpdated', { message });

  } catch (error) {
    socket.emit('alert', { message: error.message });
  }
});



// Socket event to count delivered messages in each conversation for a user
// Count delivered messages for a user in all their conversations
socket.on('countDeliveredMessagesForUser', async ({ userId }) => {
  try {
    // Find all conversations the user is part of
    const conversations = await Conversation.find({ participants: userId })
      .populate('messages');

    const deliveredCounts = conversations.map(conversation => {
      // Filter messages with "delivered" status
      const deliveredMessages = conversation.messages.filter(message => message.status === "delivered");

      // Return the count of delivered messages for each conversation
      return {
        conversationId: conversation._id,
        deliveredMessagesCount: deliveredMessages.length
      };
    });

    socket.emit('deliveredMessagesCount', { counts: deliveredCounts });
  } catch (error) {
    console.error('Error counting delivered messages:', error);
    socket.emit('errorMessage', { message: error.message });
  }
});



  
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`Client joined conversation: ${conversationId}`);
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

