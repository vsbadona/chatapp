// Login Register 

import User from "../Schema/userSchema.js"
import Conversation from "../Schema/conversationSchema.js"
import Message from "../Schema/messageSchema.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export const registerUser = async (req, res) => {
  const { username, password } = req.body;
  const ifExist = await User.findOne({ username });
  if (ifExist) {
    return res.json({ message: "Username already exist" });
  }
  const user = new User({ username });
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  await user.save();
  res.json({ success: "User created successfully" });
}

export const findUser = async(req,res) => {
  const token = req.params.token;
  const decoded = jwt.verify(token, 'secretKey');
  const userId = decoded.userId;
  if (!userId) return res.json({ message: 'Invalid Token' });
  const findUser = await User.findById(userId);
  if (!findUser) return res.json({ message: 'User not found'})
    res.json(findUser);
}

export const loginUser = async (req, res) => {
  const { username, password } = req.query;
  if(!username || !password){
    res.json({message:"Provide all details"})
  }
  const user = await User.findOne({ username });
  if (!user) {
    return res.json({ message: "User not found" })
  }
  const isValid = bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.json({ message: "Invalid password" })
  }
  const token = jwt.sign({ userId: user._id }, 'secretKey')  //, { expiresIn: '1h' }
  res.json({ token: token, success: "User logged in successfully",user:user })
}

//Update Profile upload image

export const updateProfile = async (req, res) => {
  const { userId, username} = req.body;
  
  let image = ''; // Initialize image variable

  try {
      const findUser = await User.findById(userId);

      // Check if user exists
      if (findUser) {
          // Check if req.file exists
          if (req.file) {
              image = req.file.path;
          }

       if(username == findUser.username){
           // Update user fields
          
             findUser.username = username;
           findUser.image = image;
 
           // Save updated user document
           const updatedUser = await findUser.save();
 
           // Return success response
           return res.json({ success: "Profile updated", data: updatedUser });
       }else{
        const checkAvailability = await User.findOne({username})
        if(checkAvailability){
          res.json({message:"Username Exists"})
        }else{
          findUser.username = username;
           findUser.image = image;
 
           // Save updated user document
           const updatedUser = await findUser.save();
 
           // Return success response
           return res.json({ success: "Profile updated", data: updatedUser });
       }
       }
          
      } else {
          // User not found
          return res.json({ message: "User not found" });
      }
  } catch (error) {
      // Log error for debugging
      console.error("Error updating profile:", error);

      // Return error response
      return res.json({ error: "An error occurred while updating the profile." });
  }
};

// Create New Conversation 
export const createConv = async (req, res) => {
  const { username, userId } = req.body;
  if(!username || !userId){
    res.json({message:"Provide all details"})
  }
  try {
    const user = await User.findOne({ username });
  if (!user) return res.json({ message: 'User not found' });
  if(user?._id == userId){
    res.json({message:"You can't create a conversation with yourself"})
  }else{
    
  const ifConExist = await Conversation.find({
    users: user._id
  })
  if(ifConExist != 0){
    res.json({message:"Conversation already exists"})
  }else{
    const conversation = new Conversation({ users: [user._id,userId],sender:userId});
    await conversation.save();
    res.json({ success: 'Conversation created successfully' });
  }
  }
  } catch (error) {
    res.json({message:error})
  }
};

//Get all conversations

export const getConv = async (req, res) => {
  const { userId } = req.query;
  if(!userId){
    res.json({message:"Provide all details"})
  }
  const conversations = await Conversation.find({ users: userId }).populate('users').populate('sender').populate('messages');
  if(conversations){
    res.json(conversations);
    }
};

// Send new message to selected conversation
export const newMsgConv = async (req, res) => {
  const conversationId = req.params.conversationId;
  const { text, userId } = req.body;

  try {
    // Find the conversation by ID
    const findConv = await Conversation.findById(conversationId);

    if (findConv) {
      // Create a new message object
      const newMessage = {
        text: text,
        user: userId,
        conversation: conversationId
      };

      // Push the new message into the conversation's messages array
      findConv.messages.push(newMessage);

      // Save the updated conversation
      await findConv.save();
      req.io.to(conversationId).emit("newMessage", newMessage);
      res.status(200).json({
        success:  "Message added successfully",
        conversation: findConv,
      });
    } else {
      res.status(404).json({ message: "Conversation not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all messages from selected conversations

export const getMsg = async (req, res) => {
  const conversationId = req.params.conversationId;

  try {
    const findConv = await Conversation.findById(conversationId)
   

    if (findConv) {
      res.status(200).json({
        success: "Messages retrieved successfully",
        messages: findConv.messages,
      });
    } else {
      res.status(404).json({ message: "Conversation not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


//Search user by username

export const search = async (req, res) => {
  const { query } = req.query;
  if(!query){
    res.json({message:"Provide all details"})
  }
  const users = await User.find({ username: new RegExp(query, 'i') });
  res.json(users);
};