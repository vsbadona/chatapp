import express from "express";
import { makeUser,makeYear,makeMonth,getData,getAllUser } from "../Controller/userController.js";

const Routes = express.Router();

Routes.post('/make',makeUser)
Routes.post('/year',makeYear)
Routes.post('/month',makeMonth);

Routes.get('/data',getData)
Routes.get('/alluser',getAllUser)
export default Routes;