import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:String,
    fathername:String,
    years:[
        {
            year:Number,
            months:[
                {
                    month:String,
                    rs:Number
                }
            ]
        }
    ]
})

const User = mongoose.model("User",userSchema);
export default User;