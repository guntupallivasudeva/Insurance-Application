import User from "../models/User.js";
import jwt from "jsonwebtoken";
import Joi from "joi";

const userSchema = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('Customer', 'Admin', 'Agent').optional()
});
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

//@route POST /api/users/register
//@desc Register a new user for the authenticated user
//@access Public

export const registerUser = async (req, res) => {
    try {
        const { error } = userSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(409).json({ error: "User with this email already exists" });
        }

        const newUser = new User({
            ...req.body,
            role: req.body.role || 'Customer' // Default role is Customer
        });

        await newUser.save();
        
        // Don't send password in response
        const { password, ...userResponse } = newUser.toObject();
        
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: userResponse
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to create user: " + err.message });
    }
};

//@route GET /api/users/login
//@desc Login user and return JWT token
//@access Public
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        const { error } = loginSchema.validate({ email, password });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: "8h",
        });

        // Don't send password in response
        const { password: userPassword, ...userResponse } = user.toObject();

        res.status(200).json({ 
            success: true,
            message: "Login successful",
            token, 
            user: userResponse 
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to login user: " + err.message });
    }
};

