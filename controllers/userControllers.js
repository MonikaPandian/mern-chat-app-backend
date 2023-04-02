const asyncHandler = require("express-async-handler");
const User = require('../models/userModel')
const generateToken = require("../utils/generateToken");
const nodeMailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, pic } = req.body;
    if (!name || !email || !password) {
        res.status(400);
        throw new Error("Please Enter all the fields")
    }
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error("User already exists. Please try some other email id");
    }

    const user = await User.create({
        name,
        email,
        password,
        pic,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error("Failed to Create the User");
    }
});

const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email })
    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            pic: user.pic,
            token: generateToken(user._id)
        });
    } else {
        res.status(401);
        throw new Error("Invalid Email or Password");
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email })

    if (!user) {
        res.status(400).send({ message: "Invalid Email" })
        return;
    }

    try {
        const secret = process.env.JWT_SECRET + user.password
        const payload = {
            email: user.email,
            id: user._id
        }
        //User exist and now create a one time link valid for 15 minutes
        const token = jwt.sign(payload, secret, { expiresIn: '15m' });
        const link = `https://mern-chat-app-nu.vercel.app/reset-password/${user._id}/${token}`;
        var transporter = nodeMailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'panmonikmm@gmail.com',
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });
        var mailOptions = {
            from: 'panmonikmm@gmail.com',
            to: `${user.email}`,
            subject: 'Password reset link from Chat-Box application',
            html: `We have received your request for reset password. Click this link to reset your password.<br>
                  <a href = ${link}>Click Here</a><br>
                  <p>This link is valid for 15 minutes from your request initiation for password recovery.</p>`
        };

        await transporter.sendMail(mailOptions).then((response) => console.log(response)).catch((error) => console.log(error));
        res.send({ message: "Email sent successfully" })
    }
    catch (error) {
        res.send({ status: "error", data: error })
    }
});

const resetPassword = asyncHandler(async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;

    //check if this id exist in database
    const user = await User.findById(id)

    if (!user) {
        res.status(400).send({ message: "User not exists!!" })
        return;
    }
    const secret = process.env.JWT_SECRET + user.password;
    try {
        const verify = jwt.verify(token, secret)
        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(password, salt)
        await User.findByIdAndUpdate({ _id: id }, { $set: { password: encryptedPassword } })
        res.send({ message: "Password updated" })
    }
    catch (error) {
        res.send({ message: "Something went wrong" })
    }
});

//api/user?search=
const searchUsers = asyncHandler(async (req, res) => {
    var pattern = "^" + req.query.search;

    const keyword = req.query.search ? {
        "$or": [
            { name: { $regex: pattern, $options: "i" } },
            { email: { $regex: pattern, $options: "i" } },
        ],
    }
        : {};
    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.send(users);
});

module.exports = { registerUser, authUser, forgotPassword, resetPassword, searchUsers };


