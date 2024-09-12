import mongoose from "mongoose";

const messageSchema = mongoose.Schema({
  text: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }
})

const Message = mongoose.model("Message", messageSchema);


export default Message;