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
// View all claims for policies assigned to the agent
router.get('/assignedclaims', agentAuth, agentController.assignedClaims);
// Get details for a specific claim by claimId
router.get('/claim/:id', agentAuth, agentController.getClaimById);


export default router;
