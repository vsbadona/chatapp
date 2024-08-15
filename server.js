import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';
import cors from 'cors';
import userRoutes from "./Routes/userRoutes.js"
import mongoose from 'mongoose';
import dotenv from 'dotenv';
const app = express();

dotenv.config()
app.use(cors());
app.use(express.json());


app.use('/',userRoutes)
const PORT = process.env.PORT || 8000;

app.listen(PORT,()=>console.log("Server is Listening on PORT :",PORT));

const URL = "mongodb+srv://Vishal123:Vishal123@cluster0.hwzrbs5.mongodb.net/shivmandir?retryWrites=true&w=majority&appName=Cluster0"
mongoose.connect(URL);

const db = mongoose.connection;
db.on('error',(err)=>console.log(err))
db.once('open',()=>console.log("Connected to DB"))






// const server = createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*', // allow requests from any origin
//     credentials: true, // allow credentials (e.g. cookies) to be sent
//   },
// });

// app.use(express.static('public'));
// app.use(cors({
//   origin: '*', // allow requests from any origin
//   credentials: true, // allow credentials (e.g. cookies) to be sent
// }));

// io.on('connection', (socket) => {
//   console.log('New client connected');

//   socket.on('disconnect', () => {
//     console.log('Client disconnected');
//   });

//   socket.on('message', (message) => {
//     console.log(`Received message: ${message}`);
//     io.emit('message', message);
//   });
// });

// server.listen(3001, () => {
//   console.log('Server listening on port 3001');
// });