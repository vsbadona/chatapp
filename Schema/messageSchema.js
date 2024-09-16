import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
  text: String,
  image: String,
  status: { type: String, default: "delivered" },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
