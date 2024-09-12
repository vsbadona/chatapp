import mongoose from "mongoose";

const conversationSchema = mongoose.Schema({
  sender:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{ text: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }}]
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;