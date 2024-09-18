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
      const newMessage = {
        text,
        reciever: userId,
        status,
        conversation: conversationId
      };

      // // Save the message
      // await newMessage.save();

      // Push the message to the conversation
      conversation.messages.push(newMessage);
      await conversation.save();

      io.to(conversationId).emit('newMessage', newMessage);
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
        path: 'messages'  // Populate sender info
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

    // Find the specific message in the messages array
    const message = conversation.messages.find(msg => String(msg._id) === String(messageId));

    if (!message) {
      return ;
    }

    // Ensure the user trying to update is not the sender (only receiver can mark it as read)
    if (String(message.reciever) !== String(userId)) {
      return socket.emit('alert', { message: "You don't have permission to update this message" });
    }

    // Update the status of the specific message to 'read'
    message.status = status;

    // Find all previous "delivered" messages for the same user and mark them as "read"
    conversation.messages.forEach(msg => {
      if (msg.status === 'delivered' && String(msg.reciever) === String(userId)) {
        msg.status = 'read';
      }
    });

    // Save the conversation only once after updating all messages
    await conversation.save();

    // Emit the success event with the updated message
    socket.emit('successMessage', { messageId: message._id, status: message.status });

    // Notify all participants in the conversation that message statuses have been updated
    io.to(conversationId).emit('messageStatusUpdated', { messageId: message._id, status: message.status });

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

  socket.on('createcon', async({username,userId}) => {
    if (!username || !userId) {
      socket.emit('alert', { message: "Provide all details" });
    }
  
    try {
      // Find the user by username
      const user = await User.findOne({ username });
      if (!user) socket.emit('alert',{ message: 'User not found' });
  
      // Ensure that the user is not creating a conversation with themselves
      if (user._id.toString() === userId) {
        return socket.emit('alert',{ message: "You can't create a conversation with yourself" });
      }
  
      // Check if a conversation already exists between the two users
      const ifConExist = await Conversation.findOne({
        participants: { $all: [user._id, userId] }
      });
  
      if (ifConExist) {
       return socket.emit('alert',{ message: "Conversation already exists" });
      }
  
      // Create a new conversation
      const conversation = new Conversation({
        participants: [user._id, userId],
      });
  
      // Save the conversation
      await conversation.save();
  
      // Add conversation to both users' conversation lists
      const userInitiator = await User.findById(user._id);
      const userRecipient = await User.findById(userId);
  
      if (userInitiator && userRecipient) {
        userInitiator.conversations = [...userInitiator.conversations, conversation._id];
        userInitiator.conversations.user = user._id;
        userRecipient.conversations = [...userRecipient.conversations, conversation._id];
        userRecipient.conversations.user = userId;
  
        await userInitiator.save();
        await userRecipient.save();
        const populatedConversation = await conversation.populate('participants', 'username image');

      // Emit the conversation with populated participants
      socket.emit('getConv', {
        success: 'Conversation created successfully',
        conversation: populatedConversation,
      });
      } else {
      return socket.emit('alert',{ message: "Error updating users' conversation list" });
      }
  
    } catch (error) {
     socket.emit('error',{ message: error.message });
    }
  })


  socket.on('getAllCon',async({userId}) =>{
  
  if (!userId) {
    return socket.emit('alert',{ message: "Provide all details" });
  }

  try {
    // Find the user by ID and populate their conversations
    const user = await User.findById(userId).populate({
      path: 'conversations',
      populate: {
        path: 'participants',  // Populate the users field inside each conversation
        select: 'username image'  // Only select relevant user fields
      }
    });

    if (!user) {
      return socket.emit('alert',{ message: "User not found" });
    }

    if (user.conversations.length > 0) {
      socket.emit('getAllCon',{conversations:user.conversations});
    } else {
      socket.emit('alert',{ message: "No conversations found" });
    }

  } catch (error) {
    socket.emit('alert',{ message: error.message });
  }
  })

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});


app.use((req, res, next) => {
  req.io = io;  // Attach io to the request object
  next();
});
const PORT = process.env.PORT || 10000;
server.listen(PORT,()=>{
    console.log("Server is listening to PORT:",PORT);
})

