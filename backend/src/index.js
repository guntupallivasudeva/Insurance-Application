import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import adminRoutes from './routes/adminRoutes.js';
// import paymentRoutes from './routes/paymentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import agentRoutes from './routes/agentRoutes.js';


//Load environment variables from .env file

dotenv.config();

const app = express();

app.use(cors());

//Global middleware for parse JSON bodies for all routes
app.use(express.json());




// integrate account rest api routes with /api/v1 base URL
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
// app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/agents', agentRoutes);

// app.use('/api/v1/agents', agentRoutes);
// app.use('/api/v1/policies', policyRoutes);
// app.use('/api/v1/claims', claimRoutes);

mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("Connected to MongoDB");
        const PORT = process.env.PORT || 8000;
        app.listen(PORT, () => {
            console.log(`Server is ready at http://localhost:${PORT}/api/v1`);
        });
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });