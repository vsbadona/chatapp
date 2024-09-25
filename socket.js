// socket.js
import { Server } from "socket.io";
import Message from "./Schema/messageSchema.js";
import Conversation from "./Schema/conversationSchema.js";
import User from "./Schema/userSchema.js";
const connectedUsers = new Set();  // Use a set to track connected user IDs

// Initialize Socket
export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  io.on("connection", (socket) => {

    socket.on('getConn', (data) => {
      const { userId } = data;
  
      if (userId) {
        // Check if the user is already connected
        if (!connectedUsers.has(userId)) {
          socket.join(userId);  // Join the user's room
          connectedUsers.add(userId);  // Add user to the set
          console.log(`User with ID: ${userId} has joined their room`);
        } else {
          console.log(`User with ID: ${userId} is already in the room`);
        }
      } else {
        console.log('No userId provided in getConn event');
      }
    })

    socket.on('sendMessage', async ({ text, userId, conversationId, status }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          const newMessage = { text, reciever: userId, status, conversation: conversationId };
          conversation.messages.push(newMessage);
          await conversation.save();

          io.to(conversationId).emit('newMessage', newMessage);
        }
      } catch (error) {
        console.error("Error sending message: ", error);
        socket.emit('alert', { message: 'Error sending message' });
      }
    });

    socket.on('searchUser', async ({ query }) => {
      const users = await User.find({ username: new RegExp(query, 'i') });
      io.emit('searched', users);
    });

    socket.on('fetchat', async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findById(conversationId).populate('messages');
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

    socket.on("joinConversation", (conversationId) => {
      socket.join(conversationId);
      console.log(`Client joined conversation: ${conversationId}`);
    });

    socket.on('typing', ({ room, username }) => {
      // Broadcast to others in the room that this user is typing
      socket.to(room).emit('typing', { username });      
  });
  

  // Listen for stop typing event
  socket.on('stopTyping', ({ room, username }) => {
      // Broadcast to others that the user stopped typing
      socket.to(room).emit('stopTyping', { username });      
  });

    socket.on('createcon', async ({ username, userId }) => {
        try {
          const user = await User.findOne({ username });
          if (!user || user._id.toString() === userId) return socket.emit('alert',{message:"You Can't create a conversation with yourself"});
      
          const ifConExist = await Conversation.findOne({ participants: { $all: [user._id, userId] } });
          if (ifConExist) return socket.emit('alert',{message:"Conversation Exist"})
      
          const conversation = new Conversation({ participants: [user._id, userId] });
          await conversation.save();
      
          const userInitiator = await User.findById(user._id);
          const userRecipient = await User.findById(userId);
      
          userInitiator.conversations.push(conversation._id);
          userRecipient.conversations.push(conversation._id);
          await userInitiator.save();
          await userRecipient.save();
      
          const populatedConversation = await conversation.populate('participants', 'username image');
      
          // Emit the new conversation to both users by their userId
          socket.emit('success', { message: "success"});
          io.to(user._id.toString()).emit('newConversation', { conversation: populatedConversation });
          io.to(userId).emit('newConversation', { conversation: populatedConversation });
              } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });
      
      

      socket.on('getAllCon', async ({ userId }) => {
        try {
          // Fetch user with populated conversations and participants
          const user = await User.findById(userId).populate({
            path: 'conversations',
            populate: { path: 'participants', select: 'username image' }
          });
      
          // Process the conversations to filter participants
          const conversations = user.conversations.map(conversation => {
            // Filter out the participant whose ID matches the userId
            const filteredParticipants = conversation.participants.filter(participant => participant._id.toString() !== userId);
      
            return {
              ...conversation.toObject(), // Ensure it's a plain object for modifications
              participants: filteredParticipants // Update the participants array with filtered ones
            };
          });
      
          // Emit the modified conversations with filtered participants
          socket.emit('getAllCon', { conversations });
      
        } catch (error) {
          // Emit an error message in case of failure
          socket.emit('alert', { message: error.message });
        }
      });
      

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
};
