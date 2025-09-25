
import express from 'express';
import { registerUser, loginUser, updateUserRole } from '../controllers/UserController.js';

const router = express.Router();

// Admin route to update user role and move to correct collection
router.patch('/update-role', updateUserRole);

// Public routes (no authentication required)
router.post('/register', registerUser);
router.post('/login', loginUser);


export default router;