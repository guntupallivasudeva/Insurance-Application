import mongoose from "mongoose";
import bcrypt from "bcryptjs";


// Define the user schema

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['Customer', 'Admin', 'Agent'],
        default: 'Customer'
    },
    createdAt: { type: Date, 
        default: Date.now 
    },
    updatedAt: { type: Date, 
        default: Date.now 
    }
});

//hash password before saving the user

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

//Method to compare password during login

userSchema.methods.comparePassword = async function (CustomerPassword) {
    return await bcrypt.compare(CustomerPassword, this.password);
};

// This model is now for customers only. Collection name: 'customers'.
export default mongoose.model('Customer', userSchema, 'customers');