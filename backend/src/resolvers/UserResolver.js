import Joi from 'joi';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

//Joi schema for input validation
const userSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export const userResolver = {
  Query: {
    users: async (_, __, { user }) => {
        if (!user) throw new Error("Authentication required");
        try {
            return await User.find();
        }
        catch (error) {
            throw new Error("Error fetching users: " + error.message);
        }
    },
    user: async (_, { id }, { user }) => {
        if (!user) throw new Error("Authentication required");
        try {
            const foundUser = await User.findById(id);
            if (!foundUser) throw new Error("User not found");
            return foundUser;
        }
        catch (error) {
            throw new Error("Failed to fetch user: " + error.message);
        }
    }
  },

  Mutation: 
{
    createUser: async (_, { input }) => {
        // Validate input using Joi
        const { error } = userSchema.validate(input);
        if (error) throw new Error("Invalid input: " + error.details[0].message);
        try {
            const user = new User(input);
            return await user.save();
        }
        catch (error) {
            if (error.code === 11000) {
                throw new Error("Email is already in use");
            }
            throw new Error("Failed to create user: " + error.message);
        }
    },
    updateUser: async (_, { id, input }, { user }) => {
        if (!user) throw new Error("Authentication required");
        if (user.userId !== id) throw new Error("Unauthorized access. you can only update your account");
        try {
            const updatedUser = await User.findByIdAndUpdate(id, input, { new: true });
            if (!updatedUser) throw new Error("User not found to update");
            return updatedUser;
        }
        catch (error) {
            throw new Error("Failed to update user: " + error.message);
        }
    },
    deleteUser: async (_, { id }, { user }) => {
        if (!user) throw new Error("Authentication required");
        if (user.userId !== id) throw new Error("Unauthorized access. you can only delete your own profile");
        try {
            const deletedUser = await User.findByIdAndDelete(id);
            if (!deletedUser) throw new Error("User not found to delete");
            return true;
        }
        catch (error) {
            throw new Error("Failed to delete user: " + error.message);
        }
    },
    loginUser: async (_, { email, password }) => {
        const user = await User.findOne({ email });
        if (!user) throw new Error("Invalid Credentials -username/password");

        const isValid = await user.comparePassword(password);
        if (!isValid) throw new Error("Invalid Password");

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8d' }
        );
        return {  token , user };
    },
    agentLogin: async (_, { email, password }) => {
        const user = await User.findOne({ email });
        if (!user) throw new Error("Invalid agent credentials");

        // Check if user has agent role
        if (user.role !== 'Agent') {
            throw new Error("Access denied. Agent privileges required.");
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) throw new Error("Invalid agent credentials");

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8d' }
        );
        return { token, user };
    },
    adminLogin: async (_, { email, password }) => {
        const user = await User.findOne({ email });
        if (!user) throw new Error("Invalid admin credentials");

        // Check if user has admin role
        if (user.role !== 'Admin') {
            throw new Error("Access denied. Admin privileges required.");
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) throw new Error("Invalid admin credentials");

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8d' }
        );
        return { token, user };
    }
    }
}
