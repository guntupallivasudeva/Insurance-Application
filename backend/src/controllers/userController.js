import { moveUserToRoleCollection } from '../utils/moveUserToRoleCollection.js';
import Customer from "../models/User.js";
import Admin from "../models/admin.js";
import Agent from "../models/agent.js";
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

        const role = req.body.role || 'Customer';
        let Model;
        if (role === 'Admin') {
            Model = Admin;
        } else if (role === 'Agent') {
            Model = Agent;
        } else {
            Model = Customer;
        }

        // Check if user already exists in the respective collection
        const existingUser = await Model.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(409).json({ error: `${role} with this email already exists` });
        }

        const newUser = new Model({
            ...req.body,
            role
        });

        await newUser.save();

        // Don't send password in response
        const { password, ...userResponse } = newUser.toObject();

        res.status(201).json({
            success: true,
            message: `${role} registered successfully`,
            user: userResponse
        });
    } catch (err) {
        res.status(500).json({ error: `Failed to create ${req.body.role || 'Customer'}: ` + err.message });
    }
};

//@route GET /api/users/login
//@desc Login user and return JWT token
//@access Public
export const loginUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validate input
        const { error } = loginSchema.validate({ email, password });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        let Model;
        if (role === 'Admin') {
            Model = Admin;
        } else if (role === 'Agent') {
            Model = Agent;
        } else {
            Model = Customer;
        }

        // Check if user exists in the respective collection
        const user = await Model.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: `${role || 'Customer'} not found` });
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
            message: `${role || 'Customer'} login successful`,
            token, 
            user: userResponse 
        });
    } catch (err) {
        res.status(500).json({ error: `Failed to login ${req.body.role || 'Customer'}: ` + err.message });
    }
};

// @route PATCH /api/users/update-role
// @desc Update a user's role and move them to the correct collection
// @access Admin only (add auth middleware as needed)
export const updateUserRole = async (req, res) => {
    try {
        const { email, newRole } = req.body;
        if (!email || !newRole || !['Customer', 'Admin', 'Agent'].includes(newRole)) {
            return res.status(400).json({ error: 'Valid email and newRole required.' });
        }
        const newUser = await moveUserToRoleCollection(email, newRole);
        const { password, ...userResponse } = newUser.toObject();
        res.status(200).json({
            success: true,
            message: `User role updated and moved to ${newRole} collection`,
            user: userResponse
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user role: ' + err.message });
    }
};