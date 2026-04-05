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
    role: Joi.string().valid('Customer', 'Admin', 'Agent').optional(),
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
            let errorMessage = error.details[0].message;
            let errorCode = 'VALIDATION_ERROR';
            let suggestion = '';
            
            if (errorMessage.includes('name')) {
                if (errorMessage.includes('required')) {
                    errorMessage = 'Name is required';
                    suggestion = 'Please enter your full name';
                } else if (errorMessage.includes('length')) {
                    errorMessage = 'Name must be between 3 and 30 characters';
                    suggestion = 'Please enter a valid name';
                }
                errorCode = 'INVALID_NAME';
            } else if (errorMessage.includes('email')) {
                if (errorMessage.includes('required')) {
                    errorMessage = 'Email address is required';
                    suggestion = 'Please enter your email address';
                } else {
                    errorMessage = 'Please enter a valid email address';
                    suggestion = 'Email should be in format: user@example.com';
                }
                errorCode = 'INVALID_EMAIL';
            } else if (errorMessage.includes('password')) {
                if (errorMessage.includes('required')) {
                    errorMessage = 'Password is required';
                    suggestion = 'Please create a password';
                } else {
                    errorMessage = 'Password must be at least 6 characters long';
                    suggestion = 'Please choose a stronger password';
                }
                errorCode = 'INVALID_PASSWORD';
            }
            
            return res.status(400).json({ 
                error: errorMessage,
                errorCode,
                suggestion
            });
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
            return res.status(409).json({ 
                error: `${role} account with this email already exists`,
                errorCode: 'EMAIL_ALREADY_EXISTS',
                suggestion: 'Please use a different email address or try logging in'
            });
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
            let errorMessage = error.details[0].message;
            let errorCode = 'VALIDATION_ERROR';
            let suggestion = '';
            
            if (errorMessage.includes('email')) {
                errorMessage = 'Please enter a valid email address';
                errorCode = 'INVALID_EMAIL_FORMAT';
                suggestion = 'Email should be in format: user@example.com';
            } else if (errorMessage.includes('password')) {
                errorMessage = 'Password must be at least 6 characters long';
                errorCode = 'INVALID_PASSWORD_LENGTH';
                suggestion = 'Please enter a password with at least 6 characters';
            }
            
            return res.status(400).json({ 
                error: errorMessage,
                errorCode,
                suggestion
            });
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
            // Let's check if user exists with this email in other role collections
            let existsInOtherRole = null;
            const roles = ['Customer', 'Agent', 'Admin'];
            
            for (const checkRole of roles) {
                if (checkRole !== role) {
                    let CheckModel;
                    if (checkRole === 'Admin') CheckModel = Admin;
                    else if (checkRole === 'Agent') CheckModel = Agent;
                    else CheckModel = Customer;
                    
                    const existingUser = await CheckModel.findOne({ email });
                    if (existingUser) {
                        existsInOtherRole = checkRole;
                        break;
                    }
                }
            }
            
            if (existsInOtherRole) {
                return res.status(400).json({ 
                    error: `This email is registered as ${existsInOtherRole}. Please select the correct account type`,
                    errorCode: 'WRONG_ROLE_SELECTED',
                    suggestion: `Select "${existsInOtherRole}" from the dropdown and try again`
                });
            } else {
                return res.status(404).json({ 
                    error: `No ${role || 'Customer'} account found with this email address`,
                    errorCode: 'USER_NOT_FOUND',
                    suggestion: `Please check your email or register as a ${role || 'Customer'}`
                });
            }
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                error: "Invalid password. Please check your password and try again",
                errorCode: 'INVALID_CREDENTIALS',
                suggestion: "Make sure your password is correct"
            });
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