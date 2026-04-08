import mongoose from 'mongoose';

let isConnecting = false;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return mongoose.connection;
  }

  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    throw new Error('MONGODB_URL is required');
  }

  isConnecting = true;
  try {
    await mongoose.connect(mongoUrl);
    return mongoose.connection;
  } finally {
    isConnecting = false;
  }
};
