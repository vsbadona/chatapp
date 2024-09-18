import express from "express";
import { registerUser,loginUser, newMsgConv,  getMsg, search, findUser, updateProfile} from "../Controller/userController.js";
import multer from "multer";

const Routes = express.Router();
const upload = multer({dest : 'uploads/'});

Routes.post('/register',registerUser)
Routes.get('/login',loginUser)
Routes.post('/update',upload.single('image'),updateProfile)
Routes.get('/find/:token',findUser)
// Routes.post('/conversations',createConv)
Routes.post('/conversations/:conversationId/messages',newMsgConv);
// Routes.get('/conversations',getConv)
Routes.get('/conversations/:conversationId/messages',getMsg)
Routes.get('/search',search)

export default Routes;