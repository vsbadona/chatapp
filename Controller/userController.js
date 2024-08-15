import User from "../Schema/userSchema.js";

export const makeUser = async(req,res) => {
    const {username,fathername} = req.body;

    try {
        const existUser = await User.findOne({name:username}) && await User.findOne({name:username}) 
        if(existUser){
            return res.json({alert:"User already exist"})
        }
        const newUser =await new User({name:username,fathername:fathername})
        if(newUser){
            await newUser.save();
            res.json({success:"User created"})
        }
    } catch (error) {
        res.status(400).json({ message: 'Error while registering', error: error.message })
    }   
   
}


export const makeYear = async (req, res) => {
    const { year, id } = req.body;
    try {
        const existUser = await User.findById(id);
        if (!existUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existYear = existUser.years.find((y) => y.year === year);

        if (existYear) {
            return res.json({ alert: "Year already exist" });
        }else{
            existUser.years.push({ year: year, months: [] });
await existUser.save();
res.json({ message: 'Year created successfully' });
        }

    } catch (error) {
        res.status(400).json({ message: 'Error while creating year', error: error.message });
    }
}

export const makeMonth = async (req, res) => {
    const { month, userId, yearId, rs } = req.body;
    try {
        const existUser = await User.findById(userId);
        if (!existUser) {
            return res.json({ alert: "User not found" });
        }

        const existYear = existUser.years.find((y) => y._id.toString() === yearId);
        if (!existYear) {
            return res.json({ alert: "Year not found" });
        }

        const existMonth = existYear.months.find((m) => m.month === month);
        if (existMonth) {
            return res.json({ alert: "Month already exist" });
        }

        existYear.months.push({ month: month, rs: rs });
        await existUser.save();
        res.json({ message: "Month created successfully" });
    } catch (error) {
        res.status(400).json({ message: 'Error while creating month', error: error.message });
    }
}



//Get User Data

export const getData = async(req,res) => {
    const {id} = req.query;

    const findUse = await User.findById(id);
    if(!findUse){
        return res.json({alert: "User not found"})
        }
        res.json(findUse);
}


export const getAllUser = async (req, res) => {
    const users = await User.find();
    const fetchall = users.map((user) => {
        return {
            name: user.name,
            id: user._id
        }
    })
    res.json(fetchall);
}