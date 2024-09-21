// Login Register 

import User from "../Schema/userSchema.js"
import Conversation from "../Schema/conversationSchema.js"
import Message from "../Schema/messageSchema.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    let image =  ' ';
    if(!username || !password){
      return res.json({message: "All fields are required"})
    }
  const ifExist = await User.findOne({ username });
  if (req.file) {
    image = req.file.path;
}
  if (ifExist) {
    return res.json({ message: "Username already exist" });
  }
  const user = new User({ username });
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.image = image;
  await user.save();
  res.json({ success: "User created successfully" });
  } catch (error) {
    res.json({alert:"Internal Server Error"})
  }
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
try {
  const { username, password } = req.query;
  if(!username || !password){
    res.json({message:"Provide all details"})
  }
  const user = await User.findOne({ username });
  if (!user) {
    return res.json({ message: "User not found" })
  }
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.json({ message: "Invalid password" })
  }
  const token = jwt.sign({ userId: user._id }, 'secretKey')  //, { expiresIn: '1h' }
  res.cookie('userId', user._id.toString(), { httpOnly: true });
  res.json({ token: token, success: "User logged in successfully",user:user })
} catch (error) {
  res.json({error:error.message})
}
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
// export const createConv = async (req, res) => {
//   const { username, userId } = req.body;

//   if (!username || !userId) {
//     return res.json({ message: "Provide all details" });
//   }

//   try {
//     // Find the user by username
//     const user = await User.findOne({ username });
//     if (!user) return res.json({ message: 'User not found' });

//     // Ensure that the user is not creating a conversation with themselves
//     if (user._id.toString() === userId) {
//       return res.json({ message: "You can't create a conversation with yourself" });
//     }

//     // Check if a conversation already exists between the two users
//     const ifConExist = await Conversation.findOne({
//       participants: { $all: [user._id, userId] }
//     });

//     if (ifConExist) {
//       return res.json({ message: "Conversation already exists" });
//     }

//     // Create a new conversation
//     const conversation = new Conversation({
//       participants: [user._id, userId],
//     });

//     // Save the conversation
//     await conversation.save();

//     // Add conversation to both users' conversation lists
//     const userInitiator = await User.findById(user._id);
//     const userRecipient = await User.findById(userId);

//     if (userInitiator && userRecipient) {
//       userInitiator.conversations = [...userInitiator.conversations, conversation._id];
//       userInitiator.conversations.user = user._id;
//       userRecipient.conversations = [...userRecipient.conversations, conversation._id];
//       userRecipient.conversations.user = userId;

//       await userInitiator.save();
//       await userRecipient.save();

//       res.json({ success: 'Conversation created successfully',conversation: conversation });
//     } else {
//       res.json({ message: "Error updating users' conversation list" });
//     }

//   } catch (error) {
//     res.json({ message: error.message });
//   }
// };




//Get all conversations

// export const getConv = async (req, res) => {
//   const { userId } = req.query;

//   if (!userId) {
//     return res.json({ message: "Provide all details" });
//   }

//   try {
//     // Find the user by ID and populate their conversations
//     const user = await User.findById(userId).populate({
//       path: 'conversations',
//       populate: {
//         path: 'participants',  // Populate the users field inside each conversation
//         select: 'username image'  // Only select relevant user fields
//       }
//     });

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (user.conversations.length > 0) {
//       res.json(user.conversations);
//     } else {
//       res.json({ message: "No conversations found" });
//     }

//   } catch (error) {
//     res.json({ message: error.message });
//   }
// };


// Send new message to selected conversation
export const newMsgConv = async (req, res) => {
  const conversationId = req.params.conversationId;
  const { text, userId } = req.body;

  try {
    const findConv = await Conversation.findById(conversationId);

    if (findConv) {
      const newMessage = {
        text: text,
        user: userId,
        status: "delivered",
        conversation: conversationId
      };

      findConv.messages.push(newMessage);
      findConv.lastMessage = newMessage._id;  // Update last message

      await findConv.save();
      req.io.to(conversationId).emit("newMessage", newMessage);

      res.status(200).json({
        success: "Message added successfully",
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
      .populate({
        path: 'messages',
        populate: { path: 'sender', select: 'username image' }  // Populate message sender
      });

    if (findConv) {
      res.status(200).json({
        success: "Messages retrieved successfully",
        messages: findConv.messages,
      });
    } else {
      res.status(404).json({ message: "Conversation not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
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