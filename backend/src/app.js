import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import agentRoutes from './routes/agentRoutes.js';

const app = express();

const toOrigin = (value) => {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const allowedOrigins = [
  toOrigin(process.env.FRONTEND_URL),
  toOrigin(process.env.FRONTEND_PREVIEW_URL)
].filter(Boolean);

const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
const isVercelOrigin = (origin) => {
  try {
    return new URL(origin).hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || isLocalOrigin(origin) || isVercelOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/agents', agentRoutes);

export default app;
