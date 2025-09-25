import express from 'express';
import { registerUser, loginUser } from '../controllers/UserController.js';

const router = express.Router();

// Public routes (no authentication required)
router.post('/register', registerUser);
router.post('/login', loginUser);


export default router;