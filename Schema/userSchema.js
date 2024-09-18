import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  image: {
    type : String,
    default:'uploads/6b051467b74a585a6486cd02679fcfc8'
  },
  conversations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' ,user:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }}]
});

const User = mongoose.model("User", userSchema);
export default User;