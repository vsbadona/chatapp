// socket.js
import { Server } from "socket.io";
import Message from "./Schema/messageSchema.js";
import Conversation from "./Schema/conversationSchema.js";
import User from "./Schema/userSchema.js";

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
    console.log("New client connected");

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

    socket.on('updateMessageStatus', async ({ messageId, userId, conversationId, status }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return socket.emit('alert', { message: 'Invalid Conversation' });
        const message = conversation.messages.find(msg => String(msg._id) === String(messageId));
        if (!message || String(message.reciever) !== String(userId)) return;

        message.status = status;
        conversation.messages.forEach(msg => {
          if (msg.status === 'delivered' && String(msg.reciever) === String(userId)) {
            msg.status = 'read';
          }
        });
        await conversation.save();

        socket.emit('successMessage', { messageId: message._id, status: message.status });
        io.to(conversationId).emit('messageStatusUpdated', { messageId: message._id, status: message.status });
      } catch (error) {
        socket.emit('alert', { message: error.message });
      }
    });

    socket.on('countDeliveredMessagesForUser', async ({ userId }) => {
      try {
        const conversations = await Conversation.find({ participants: userId }).populate('messages');
        const deliveredCounts = conversations.map(conversation => {
          const deliveredMessages = conversation.messages.filter(msg => msg.status === "delivered");
          return { conversationId: conversation._id, deliveredMessagesCount: deliveredMessages.length };
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

    socket.on('createcon', async ({ username, userId }) => {
      try {
        const user = await User.findOne({ username });
        if (!user || user._id.toString() === userId) return;

        const ifConExist = await Conversation.findOne({ participants: { $all: [user._id, userId] } });
        if (ifConExist) return;

        const conversation = new Conversation({ participants: [user._id, userId] });
        await conversation.save();
        const userInitiator = await User.findById(user._id);
        const userRecipient = await User.findById(userId);

        userInitiator.conversations.push(conversation._id);
        userRecipient.conversations.push(conversation._id);
        await userInitiator.save();
        await userRecipient.save();

        const populatedConversation = await conversation.populate('participants', 'username image');
        io.to(user._id.toString()).emit('newConversation', { conversation: populatedConversation });
        io.to(userId).emit('newConversation', { conversation: populatedConversation });
        socket.emit('getConv', { success: 'Conversation created successfully', conversation: populatedConversation });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('getAllCon', async ({ userId }) => {
      try {
        const user = await User.findById(userId).populate({
          path: 'conversations',
          populate: { path: 'participants', select: 'username image' }
        });
        socket.emit('getAllCon', { conversations: user.conversations });
      } catch (error) {
        socket.emit('alert', { message: error.message });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
};
