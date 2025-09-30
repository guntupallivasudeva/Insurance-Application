import express from 'express';
import agentController, { loginAgent } from '../controllers/agentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
const agentAuth = [authenticateToken, authorizeRoles('Agent')];

// Agent login route
router.post('/login', loginAgent);

// Policy management routes
router.get('/assignedpolicies', agentAuth, agentController.assignedPolicies);
router.get('/policy-customers/:policyProductId', agentAuth, agentController.getPolicyCustomers);
router.get('/customer-payments/:userPolicyId', agentAuth, agentController.getCustomerPayments);
router.post('/approvepolicy', agentAuth, agentController.approvePolicy);

// Policy request management routes
router.get('/policy-requests', agentAuth, agentController.getPolicyRequests);
router.post('/approve-policy-request/:userPolicyId', agentAuth, agentController.approvePolicyRequest);
router.post('/reject-policy-request/:userPolicyId', agentAuth, agentController.rejectPolicyRequest);

// Approved customers route
router.get('/approved-customers', agentAuth, agentController.getApprovedCustomers);

// Claims management routes
router.get('/assignedclaims', agentAuth, agentController.assignedClaims);
router.get('/claims/:id', agentAuth, agentController.getClaimById);
router.post('/approveclaim', agentAuth, agentController.approveClaim);
router.post('/rejectclaim', agentAuth, agentController.rejectClaim);
// Update claim details (agent)
router.put('/claim/:id', agentAuth, agentController.updateClaim);

// Payment management routes
router.get('/assignedpayments', agentAuth, agentController.assignedPayments);
router.get('/payment-customers', agentAuth, agentController.getPaymentCustomers);

// Dashboard stats
router.get('/dashboard', agentAuth, agentController.getDashboardStats);

export default router;
