import express from "express";
import { registerUser,loginUser, newMsgConv,  getMsg, search, findUser, updateProfile} from "../Controller/userController.js";
import multer from "multer";
import path from "path"

const Routes = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    },
  });
  
  const upload = multer({ storage });

Routes.post('/register',upload.single('image'),registerUser)
Routes.get('/login',loginUser)
Routes.post('/update',upload.single('image'),updateProfile)
Routes.get('/find/:token',findUser)
// Routes.post('/conversations',createConv)
Routes.post('/conversations/:conversationId/messages',newMsgConv);
// Routes.get('/conversations',getConv)
Routes.get('/conversations/:conversationId/messages',getMsg)
Routes.get('/search',search)

export default Routes;