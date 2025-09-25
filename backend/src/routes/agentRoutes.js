
import express from 'express';
import agentController, { loginAgent } from '../controllers/agentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
const agentAuth = [authenticateToken, authorizeRoles('Agent')];

// Agent login route
router.post('/login', loginAgent);
router.get('/assignedpolicies', agentAuth, agentController.assignedPolicies);
router.get('/assignedpayments', agentAuth, agentController.assignedPayments);
router.post('/approvepolicy', agentAuth, agentController.approvePolicy);
router.post('/addclaim', agentAuth, agentController.addClaim);
router.post('/approveclaim', agentAuth, agentController.approveClaim);

export default router;
