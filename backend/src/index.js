import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { typeDefs,resolvers } from './graphql/schema.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { authMiddleware } from './middleware/authMiddleware.js';
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

const server = new ApolloServer({
    typeDefs,
    resolvers
});



const startServer = async () => {
    await server.start();
    
    // integrate account rest api routes with /api/v1 base URL
    app.use('/api/v1/users', userRoutes);
    app.use('/api/v1/admin', adminRoutes);
    // app.use('/api/v1/payments', paymentRoutes);
    app.use('/api/v1/customers', customerRoutes);
    app.use('/api/v1/agents', agentRoutes);
    
    // app.use('/api/v1/agents', agentRoutes);
    // app.use('/api/v1/policies', policyRoutes);
    // app.use('/api/v1/claims', claimRoutes);

    //use express middleware to integrate apollo server with express server
    app.use(
        '/graphql',
        expressMiddleware(server, {
            context: async ({ req ,res}) =>
            { 
                authMiddleware(req,res,()=>{ })
                return { user: req.user };
             }
        }
    ));

    mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("Connected to MongoDB");
        const PORT = process.env.PORT || 8000;
        app.listen(PORT, () => {
            console.log(`Server is ready at http://localhost:${PORT}/graphql`);
        });
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });
};

//start the express server
startServer();