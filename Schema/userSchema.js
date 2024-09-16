import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  image: String,
  conversations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }]
});

const User = mongoose.model("User", userSchema);
export default User;